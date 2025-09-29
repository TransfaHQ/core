import { ControlledTransaction } from 'kysely';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/setup';

import { DatabaseService } from '@libs/database/database.service';
import { DB } from '@libs/database/types';
import { uuidV7 } from '@libs/utils/uuid';

export async function setupTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  await setupApp(app);

  await app.init();
  app.enableShutdownHooks();

  return app;
}

export interface TestContext {
  app: INestApplication;
  db: DatabaseService;
  trx: ControlledTransaction<DB, []>;
  currentSavepoint: string;
  trxSavepoint: ControlledTransaction<DB, [string]>;
}

export function setupTestContext(): TestContext {
  const context: TestContext = {} as TestContext;

  beforeAll(async () => {
    context.app = await setupTestApp();
    context.db = context.app.get(DatabaseService);
    context.trx = await context.db.kysely.startTransaction().execute();
    context.db.setTransaction(context.trx);
  });

  afterAll(async () => {
    await context.trx.rollback().execute();
    await context.app.close();
  });

  beforeEach(async () => {
    context.currentSavepoint = `test_sp_${uuidV7().replace(/-/g, '_')}`;
    context.trxSavepoint = await context.trx.savepoint(context.currentSavepoint).execute();
  });

  afterEach(async () => {
    await context.trxSavepoint.rollbackToSavepoint(context.currentSavepoint).execute();
  });

  return context;
}
