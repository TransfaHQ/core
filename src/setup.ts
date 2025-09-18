import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';

import { checkPostgresVersion } from '@src/database/utils';

export async function setupApp(app: INestApplication) {
  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const dataSource = app.get(DataSource);
  await checkPostgresVersion(dataSource);
  return app;
}
