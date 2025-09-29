import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { checkPostgresVersion } from '@src/database/utils';

import { DatabaseService } from '@libs/database/database.service';

export async function setupApp(app: INestApplication<NestExpressApplication>) {
  app.use(cookieParser());
  (app as any).set('query parser', 'extended');

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.useLogger(app.get(Logger));

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

  const db = app.get(DatabaseService);
  await checkPostgresVersion(db.kysely);
  return app;
}
