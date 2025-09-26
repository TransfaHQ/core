import { EntityManager } from '@mikro-orm/postgresql';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/setup';

export async function setupTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  await setupApp(app);
  const schemaName = process.env.CORE_POSTGRES_SCHEMA || 'e2e_test';

  await app.init();
  app.enableShutdownHooks();

  if (schemaName) {
    const em = app.get(EntityManager);
    await em.getConnection().execute(`SET search_path TO ${schemaName};`);
  }

  return app;
}

export interface TestContext {
  app: INestApplication;
  em: EntityManager;
}

export function setupTestContext(): TestContext {
  const context: TestContext = {} as TestContext;

  beforeAll(async () => {
    context.app = await setupTestApp();
    context.em = context.app.get(EntityManager);
  });

  afterAll(async () => {
    await context.app.close();
  });

  beforeEach(async () => {
    await context.em.begin();
  });

  afterEach(async () => {
    await context.em.rollback();
  });

  return context;
}
