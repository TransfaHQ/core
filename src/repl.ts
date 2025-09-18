import { DataSource } from 'typeorm';

import { NestFactory, repl } from '@nestjs/core';

import { checkPostgresVersion } from '@src/database/utils';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);
  await checkPostgresVersion(dataSource);

  await repl(AppModule);
}
bootstrap().catch(() => {
  process.exit(-1);
});
