import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@libs/config/config.module';
import { ConfigService } from '@libs/config/config.service';
import { TigerBeetleModule } from '@libs/tigerbeetle/tigerbeetle.module';

import { KeysEntity } from '@modules/auth/entities/keys.entity';
import { UserEntity } from '@modules/auth/entities/user.entity';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

const ormEntities = [UserEntity, KeysEntity, LedgerEntity, LedgerAccountEntity];

@Global()
@Module({
  imports: [
    ConfigModule,
    TigerBeetleModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return configService.typeOrmConfig;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(ormEntities),
  ],
  providers: [],
  exports: [ConfigModule, TigerBeetleModule, TypeOrmModule, TypeOrmModule.forFeature(ormEntities)],
})
export class BootstrapModule {}
