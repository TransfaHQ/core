import { Module } from '@nestjs/common';

import { AccountModule } from '@modules/account/account.module';
import { BootstrapModule } from '@modules/bootstrap/bootstrap.module';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { MetadataModule } from '@modules/metadata/metadata.module';
import { TransferModule } from '@modules/transfer/transfer.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [BootstrapModule, AccountModule, MetadataModule, LedgerModule, TransferModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
