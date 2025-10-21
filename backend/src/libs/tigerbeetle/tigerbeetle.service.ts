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

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly db: DatabaseService,
    private readonly accountRepository: TigerbeetleAccountRepository,
    private readonly transferRepository: TigerbeetleTransferRepository,
  ) {}

  onModuleInit() {
    this.client = createClient(this.configService.tigerBeetleConfigs);
  }

  onModuleDestroy() {
    if (this.client) this.client.destroy();
  }

  async createAccount(
    data: Account,
    options?: { trx?: Transaction<DB>; ledgerAccountId?: string },
  ): Promise<Account> {
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

    await this.storeAccountInDB(data, options?.trx, options?.ledgerAccountId);

    return this.retrieveAccount(tbIdToBuffer(data.id));
  }

  async createAccounts(
    data: Account[],
    options?: { trx?: Transaction<DB>; ledgerAccountIds?: string[] },
  ): Promise<Account[]> {
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

    await this.storeAccountsInDB(data, options?.trx, options?.ledgerAccountIds);

    return this.retrieveAccounts(data.map((a) => tbIdToBuffer(a.id)));
  }

  async createTransfers(
    data: Transfer[],
    options?: { trx?: Transaction<DB>; ledgerEntryIds?: string[] },
  ): Promise<Transfer[]> {
    const errors = await this.client.createTransfers(data);

    if (errors.length > 0) {
      this.logger.error(`Batch transfers failed to created with ${JSON.stringify(errors)}`);
      throw new TigerBeetleTransferException('ledgerEntries', errors);
    }

    await this.storeTransfersInDB(data, options?.trx);

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

  private async storeAccountInDB(
    account: Account,
    trx?: Transaction<DB>,
    ledgerAccountId?: string,
  ): Promise<void> {
    const accountData: CreateTigerbeetleAccountData = {
      accountId: account.id,
      debitsPosted: account.debits_posted,
      debitsPending: account.debits_pending,
      creditsPosted: account.credits_posted,
      creditsPending: account.credits_pending,
      userData128: account.user_data_128,
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

  private async storeAccountsInDB(
    accounts: Account[],
    trx?: Transaction<DB>,
    ledgerAccountIds?: string[],
  ): Promise<void> {
    if (accounts.length === 0) {
      return;
    }

    const accountsData: CreateTigerbeetleAccountData[] = accounts.map((account, index) => ({
      accountId: account.id,
      debitsPosted: account.debits_posted,
      debitsPending: account.debits_pending,
      creditsPosted: account.credits_posted,
      creditsPending: account.credits_pending,
      userData128: account.user_data_128,
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

  private async storeTransfersInDB(transfers: Transfer[], trx?: Transaction<DB>): Promise<void> {
    if (transfers.length === 0) {
      return;
    }

    const transfersData: CreateTigerbeetleTransferData[] = transfers.map((transfer) => ({
      transferId: transfer.id,
      debitAccountId: transfer.debit_account_id,
      creditAccountId: transfer.credit_account_id,
      amount: transfer.amount,
      pendingId: transfer.pending_id,
      userData128: transfer.user_data_128,
      userData64: transfer.user_data_64,
      userData32: transfer.user_data_32,
      timeout: transfer.timeout,
      ledger: transfer.ledger,
      code: transfer.code,
      flags: transfer.flags,
      timestamp: transfer.timestamp,
    }));

    await this.transferRepository.createTransfers(transfersData, trx);
  }
}
