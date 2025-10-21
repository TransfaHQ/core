import {
  CamelCasePlugin,
  ControlledTransaction,
  Kysely,
  PostgresDialect,
  Transaction,
} from 'kysely';
import { Pool } from 'pg';

import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { ConfigService } from '@libs/config/config.service';
import { uuidV7 } from '@libs/utils/uuid';

import { DB } from './types';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private _client: Kysely<DB>;
  private trx: ControlledTransaction<DB>;

  constructor(protected readonly configService: ConfigService) {
    const dialect = new PostgresDialect({
      pool: new Pool({
        database: configService.dbConfig.database,
        host: configService.dbConfig.host,
        user: configService.dbConfig.user,
        port: configService.dbConfig.port,
        max: 10,
        password: configService.dbConfig.password,
      }),
    });
    this._client = new Kysely({
      dialect,
      plugins: [new CamelCasePlugin({ underscoreBeforeDigits: true })],
      log: process.env.NODE_ENV === 'test' ? ['error'] : ['query', 'error'],
    });
  }

  get kysely(): Kysely<DB> {
    if (this.trx) {
      return this.trx;
    }
    return this._client.withSchema(this.configService.dbConfig.schema);
  }

  setTransaction(trx: ControlledTransaction<DB>) {
    this.trx = trx;
  }

  async transaction<T>(fn: (trx: Transaction<DB>) => Promise<T>): Promise<T> {
    if (this.trx) {
      const savepoint = uuidV7().replace(/-/g, '_');
      const trxWithSavepoint = await this.trx.savepoint(savepoint).execute();
      let result: T;
      try {
        result = await fn(trxWithSavepoint);
      } catch (err) {
        await trxWithSavepoint.rollbackToSavepoint(savepoint).execute();
        throw err;
      }
      await trxWithSavepoint.releaseSavepoint(savepoint).execute();
      return result;
    } else {
      return await this.kysely.transaction().execute(fn);
    }
  }

  async onModuleDestroy() {
    await this._client.destroy();
  }
}
