import { DataSource } from 'typeorm';

import { NestFactory } from '@nestjs/core';

import { checkPostgresVersion } from '@src/database/utils';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);
  await checkPostgresVersion(dataSource);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(() => {
  process.exit(-1);
});
