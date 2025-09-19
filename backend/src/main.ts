import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { setupApp } from './setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  await setupApp(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(() => {
  process.exit(-1);
});
