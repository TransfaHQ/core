import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Global, Module } from '@nestjs/common';

import { ConfigModule } from '@libs/config/config.module';
import { ConfigService } from '@libs/config/config.service';
import { TigerBeetleModule } from '@libs/tigerbeetle/tigerbeetle.module';

import { KeysEntity } from '@modules/auth/entities/keys.entity';
import { UserEntity } from '@modules/auth/entities/user.entity';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import {
  LedgerAccountMetadataEntity,
  LedgerMetadataEntity,
} from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

const ormEntities = [
  UserEntity,
  KeysEntity,
  LedgerEntity,
  LedgerAccountEntity,
  LedgerMetadataEntity,
  LedgerAccountMetadataEntity,
];

@Global()
@Module({
  imports: [
    ConfigModule,
    TigerBeetleModule,
    MikroOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return configService.mikroOrmConfig;
      },
      inject: [ConfigService],
    }),
    MikroOrmModule.forFeature(ormEntities),
  ],
  providers: [],
  exports: [
    ConfigModule,
    TigerBeetleModule,
    MikroOrmModule,
    MikroOrmModule.forFeature(ormEntities),
  ],
})
export class BootstrapModule {}
