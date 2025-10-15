import { NestFactory } from '@nestjs/core';

import { ConfigService } from '@libs/config/config.service';

import { AppModule } from './app.module';
import { setupApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const corsOrigins = app.get(ConfigService).corsAllowedOrigins;

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'idempotency-key'],
  });

  await setupApp(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
