import { DataSource } from 'typeorm';

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
    const ds = app.get(DataSource);
    await ds.query(`SET search_path TO ${schemaName};`);
  }

  return app;
}
