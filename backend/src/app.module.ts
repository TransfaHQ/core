import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';

import { KyselyExceptionFilter } from '@libs/api/filters/kysely-exception.filter';
import { ConfigService } from '@libs/config/config.service';

import { AuthModule } from '@modules/auth/auth.module';
import { BootstrapModule } from '@modules/bootstrap/bootstrap.module';
import { LedgerModule } from '@modules/ledger/ledger.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

const filters = [
  {
    provide: APP_FILTER,
    useClass: KyselyExceptionFilter,
  },
];

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/api/*api', '/v1/*v1'],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
          level: configService.logLevel,
          customProps: () => ({}),
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              remoteAddress: req.remoteAddress,
              remotePort: req.remotePort,
            }),
            res: (res) => ({
              statusCode: res.statusCode,
            }),
          },
        },
      }),
    }),
    BootstrapModule,
    AuthModule,
    LedgerModule,
  ],
  controllers: [AppController],
  providers: [AppService, ...filters],
})
export class AppModule {}
