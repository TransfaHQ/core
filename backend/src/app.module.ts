import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { ConfigService } from '@libs/config/config.service';

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
    TransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
