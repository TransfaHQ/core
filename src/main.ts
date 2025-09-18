import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { checkPostgresVersion } from '@src/database/utils';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const dataSource = app.get(DataSource);
  await checkPostgresVersion(dataSource);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(() => {
  process.exit(-1);
});
