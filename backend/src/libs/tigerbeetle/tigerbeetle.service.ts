import { Transaction } from 'kysely';
import { PinoLogger } from 'nestjs-pino';
import { Account, CreateAccountError, Transfer, createClient } from 'tigerbeetle-node';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { DatabaseService } from '@libs/database/database.service';
import { DB } from '@libs/database/types';
import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';
import { TigerBeetleTransferException } from '@libs/exceptions';

import { ConfigService } from '../config/config.service';
import {
  CreateTigerbeetleAccountData,
  CreateTigerbeetleTransferData,
  TigerbeetleAccountRepository,
  TigerbeetleTransferRepository,
} from './repositories';

@Injectable()
export class TigerBeetleService implements OnModuleDestroy, OnModuleInit {
  private client: ReturnType<typeof createClient>;
  private secondaryClient: ReturnType<typeof createClient> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly db: DatabaseService,
    private readonly accountRepository: TigerbeetleAccountRepository,
    private readonly transferRepository: TigerbeetleTransferRepository,
  ) {}

  onModuleInit() {
    // Initialize primary client
    this.client = createClient(this.configService.tigerBeetleConfigs);

    // Initialize secondary client if dual-write is enabled
    const secondaryConfig = this.configService.tigerBeetleSecondaryConfigs;
    if (this.configService.tigerBeetleDualWriteEnabled && secondaryConfig) {
      this.logger.info('Initializing secondary TigerBeetle client for dual-write');
      this.secondaryClient = createClient(secondaryConfig);
    }
  }

  onModuleDestroy() {
    if (this.client) this.client.destroy();
    if (this.secondaryClient) this.secondaryClient.destroy();
  }

  async createAccount(
    data: Account,
    options?: { trx?: Transaction<DB>; ledgerAccountId?: string },
  ): Promise<Account> {
    // Create on primary cluster
    const errors = await this.client.createAccounts([data]);
    for (const error of errors) {
      this.logger.error(
        `Batch account at ${error.index} failed to create: ${CreateAccountError[error.result]}.`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Failed to create ${errors.length} account(s): ${errors.map((e) => CreateAccountError[e.result]).join(', ')}`,
      );
    }

    // Create on secondary cluster if dual-write enabled
    if (this.secondaryClient) {
      try {
        const secondaryErrors = await this.secondaryClient.createAccounts([data]);
        if (secondaryErrors.length > 0) {
          this.logger.error(
            `Failed to create account on secondary cluster: ${secondaryErrors.map((e) => CreateAccountError[e.result]).join(', ')}`,
          );
          throw new BadRequestException('Failed to create account on secondary cluster');
        }
      } catch (error) {
        this.logger.error(`Secondary cluster account creation error: ${error.message}`);
        throw new BadRequestException('Failed to create account on secondary cluster');
      }
    }

    // Store in database
    await this.storeAccountInDB(data, options?.trx, options?.ledgerAccountId);

    return this.retrieveAccount(tbIdToBuffer(data.id));
  }

  async createAccounts(
    data: Account[],
    options?: { trx?: Transaction<DB>; ledgerAccountIds?: string[] },
  ): Promise<Account[]> {
    // Create on primary cluster
    const errors = await this.client.createAccounts(data);
    for (const error of errors) {
      this.logger.error(
        `Batch account at ${error.index} failed to create: ${CreateAccountError[error.result]}.`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Failed to create ${errors.length} account(s): ${errors.map((e) => CreateAccountError[e.result]).join(', ')}`,
      );
    }

    // Create on secondary cluster if dual-write enabled
    if (this.secondaryClient) {
      try {
        const secondaryErrors = await this.secondaryClient.createAccounts(data);
        if (secondaryErrors.length > 0) {
          this.logger.error(
            `Failed to create ${secondaryErrors.length} accounts on secondary cluster`,
          );
          throw new BadRequestException('Failed to create accounts on secondary cluster');
        }
      } catch (error) {
        this.logger.error(`Secondary cluster accounts creation error: ${error.message}`);
        throw new BadRequestException('Failed to create accounts on secondary cluster');
      }
    }

    // Store in database
    await this.storeAccountsInDB(data, options?.trx, options?.ledgerAccountIds);

    return this.retrieveAccounts(data.map((a) => tbIdToBuffer(a.id)));
  }

  async createTransfers(
    data: Transfer[],
    options?: { trx?: Transaction<DB>; ledgerEntryIds?: string[] },
  ): Promise<Transfer[]> {
    // Create on primary cluster
    const errors = await this.client.createTransfers(data);

    if (errors.length > 0) {
      this.logger.error(`Batch transfers failed to created with ${JSON.stringify(errors)}`);
      throw new TigerBeetleTransferException('ledgerEntries', errors);
    }

    // Create on secondary cluster if dual-write enabled
    if (this.secondaryClient) {
      try {
        const secondaryErrors = await this.secondaryClient.createTransfers(data);
        if (secondaryErrors.length > 0) {
          this.logger.error(
            `Failed to create ${secondaryErrors.length} transfers on secondary cluster`,
          );
          throw new TigerBeetleTransferException('ledgerEntries', secondaryErrors);
        }
      } catch (error) {
        this.logger.error(`Secondary cluster transfers creation error: ${error.message}`);
        throw new BadRequestException('Failed to create transfers on secondary cluster');
      }
    }

    // Store in database
    await this.storeTransfersInDB(data, options?.trx, options?.ledgerEntryIds);

    return this.client.lookupTransfers(data.map((v) => v.id));
  }

  async retrieveAccounts(ids: Buffer<ArrayBufferLike>[]): Promise<Account[]> {
    return this.client.lookupAccounts(ids.map((i) => bufferToTbId(i)));
  }

  async retrieveAccount(id: Buffer<ArrayBufferLike>): Promise<Account> {
    const response = await this.retrieveAccounts([id]);
    if (response.length === 0) throw new NotFoundException();
    return response[0];
  }

  async retrieveTransfer(id: Buffer<ArrayBufferLike>): Promise<Transfer> {
    const response = await this.retrieveTransfers([id]);
    if (response.length === 0) throw new NotFoundException();
    return response[0];
  }

  async retrieveTransfers(ids: Buffer<ArrayBufferLike>[]): Promise<Transfer[]> {
    return this.client.lookupTransfers(ids.map((i) => bufferToTbId(i)));
  }

  /**
   * Store a single account in the database
   */
  private async storeAccountInDB(
    account: Account,
    trx?: Transaction<DB>,
    ledgerAccountId?: string,
  ): Promise<void> {
    const accountData: CreateTigerbeetleAccountData = {
      accountId: tbIdToBuffer(account.id),
      debitsPosted: account.debits_posted,
      debitsPending: account.debits_pending,
      creditsPosted: account.credits_posted,
      creditsPending: account.credits_pending,
      userData128: account.user_data_128 ? tbIdToBuffer(account.user_data_128) : undefined,
      userData64: account.user_data_64,
      userData32: account.user_data_32,
      ledger: account.ledger,
      code: account.code,
      flags: account.flags,
      timestamp: account.timestamp,
      ledgerAccountId,
    };

    await this.accountRepository.createAccount(accountData, trx);
  }

  /**
   * Store multiple accounts in the database
   */
  private async storeAccountsInDB(
    accounts: Account[],
    trx?: Transaction<DB>,
    ledgerAccountIds?: string[],
  ): Promise<void> {
    if (accounts.length === 0) {
      return;
    }

    const accountsData: CreateTigerbeetleAccountData[] = accounts.map((account, index) => ({
      accountId: tbIdToBuffer(account.id),
      debitsPosted: account.debits_posted,
      debitsPending: account.debits_pending,
      creditsPosted: account.credits_posted,
      creditsPending: account.credits_pending,
      userData128: account.user_data_128 ? tbIdToBuffer(account.user_data_128) : undefined,
      userData64: account.user_data_64,
      userData32: account.user_data_32,
      ledger: account.ledger,
      code: account.code,
      flags: account.flags,
      timestamp: account.timestamp,
      ledgerAccountId: ledgerAccountIds?.[index],
    }));

    await this.accountRepository.createAccounts(accountsData, trx);
  }

  /**
   * Store multiple transfers in the database
   */
  private async storeTransfersInDB(
    transfers: Transfer[],
    trx?: Transaction<DB>,
    ledgerEntryIds?: string[],
  ): Promise<void> {
    if (transfers.length === 0) {
      return;
    }

    const transfersData: CreateTigerbeetleTransferData[] = transfers.map((transfer, index) => ({
      transferId: tbIdToBuffer(transfer.id),
      debitAccountId: tbIdToBuffer(transfer.debit_account_id),
      creditAccountId: tbIdToBuffer(transfer.credit_account_id),
      amount: transfer.amount,
      pendingId: transfer.pending_id ? tbIdToBuffer(transfer.pending_id) : undefined,
      userData128: transfer.user_data_128 ? tbIdToBuffer(transfer.user_data_128) : undefined,
      userData64: transfer.user_data_64,
      userData32: transfer.user_data_32,
      timeout: transfer.timeout,
      ledger: transfer.ledger,
      code: transfer.code,
      flags: transfer.flags,
      timestamp: transfer.timestamp,
      ledgerEntryId: ledgerEntryIds?.[index],
    }));

    await this.transferRepository.createTransfers(transfersData, trx);
  }
}
