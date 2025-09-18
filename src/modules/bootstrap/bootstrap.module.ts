import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@libs/config/config.module';
import { ConfigService } from '@libs/config/config.service';
import { TigerBeetleModule } from '@libs/tigerbeetle/tigerbeetle.module';

const ormEntities = [];

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
