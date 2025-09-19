import assert from 'assert';
import { Account, CreateAccountError, createClient } from 'tigerbeetle-node';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ConfigService } from '../config/config.service';

@Injectable()
export class TigerBeetleService implements OnModuleDestroy, OnModuleInit {
  private client: ReturnType<typeof createClient>;

  constructor(protected readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = createClient(this.configService.tigerBeetleConfigs);
  }

  onModuleDestroy() {
    if (this.client) this.client.destroy();
  }

  async createAccount(data: Account): Promise<void> {
    const errors = await this.client.createAccounts([data]);
    for (const error of errors) {
      console.error(
        `Batch account at ${error.index} failed to create: ${CreateAccountError[error.result]}.`,
      );
    }
    assert.strictEqual(errors.length, 0);
  }

  createTransfers(): Promise<void> {
    throw new Error('NotImplementedEror');
  }
}
