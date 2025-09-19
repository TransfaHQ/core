import { Global, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { ConfigModule } from '@libs/config/config.module';
import { ConfigService } from '@libs/config/config.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './guards/admin.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtGuard } from './guards/jwt.guard';
import { ApiKeyOrJwtGuard } from './guards/api-key-or-jwt.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: configService.jwtExpiresIn,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard, ApiKeyGuard, JwtGuard, ApiKeyOrJwtGuard, JwtService],
  exports: [AuthService, ApiKeyGuard, JwtGuard, ApiKeyOrJwtGuard, JwtService],
})
export class AuthModule {}
