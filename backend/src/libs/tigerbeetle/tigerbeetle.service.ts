import { PinoLogger } from 'nestjs-pino';
import { Account, CreateAccountError, Transfer, createClient } from 'tigerbeetle-node';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { bufferToTbId, tbIdToBuffer } from '@libs/database/utils';
import { TigerBeetleTransferException } from '@libs/exceptions';

import { ConfigService } from '../config/config.service';

@Injectable()
export class TigerBeetleService implements OnModuleDestroy, OnModuleInit {
  private client: ReturnType<typeof createClient>;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit() {
    this.client = createClient(this.configService.tigerBeetleConfigs);
  }

  onModuleDestroy() {
    if (this.client) this.client.destroy();
  }

  async createAccount(data: Account): Promise<Account> {
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

    return this.retrieveAccount(tbIdToBuffer(data.id));
  }

  async createAccounts(data: Account[]): Promise<Account[]> {
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

    return this.retrieveAccounts(data.map((a) => tbIdToBuffer(a.id)));
  }

  async createTransfers(data: Transfer[]): Promise<Transfer[]> {
    const errors = await this.client.createTransfers(data);

    if (errors.length > 0) {
      this.logger.error(`Batch transfers failed to created with ${JSON.stringify(errors)}`);
      throw new TigerBeetleTransferException('ledgerEntries', errors);
    }

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
}
