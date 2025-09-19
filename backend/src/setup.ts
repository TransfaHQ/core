import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { checkPostgresVersion } from '@src/database/utils';

export async function setupApp(app: INestApplication) {
  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Core API')
    .setDescription('Financial ledger and accounting API')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('apidocs', app, document);

  const dataSource = app.get(DataSource);
  await checkPostgresVersion(dataSource);
  return app;
}
