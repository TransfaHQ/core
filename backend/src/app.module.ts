import { Module } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';
import { BootstrapModule } from '@modules/bootstrap/bootstrap.module';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { TransferModule } from '@modules/transfer/transfer.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [BootstrapModule, AuthModule, LedgerModule, TransferModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
