import { NestFactory, repl } from '@nestjs/core';

import { AppModule } from './app.module';
import { setupApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await setupApp(app);
  await repl(AppModule);
}

bootstrap().catch(() => {
  process.exit(-1);
});
