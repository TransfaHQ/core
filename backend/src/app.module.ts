import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { AuthModule } from '@modules/auth/auth.module';
import { BootstrapModule } from '@modules/bootstrap/bootstrap.module';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { TransferModule } from '@modules/transfer/transfer.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/*', '/v1/*'],
    }),
    BootstrapModule,
    AuthModule,
    LedgerModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
