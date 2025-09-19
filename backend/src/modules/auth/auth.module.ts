import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@libs/config/config.module';
import { ConfigService } from '@libs/config/config.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { KeysEntity } from './entities/keys.entity';
import { UserEntity } from './entities/user.entity';
import { AdminGuard } from './guards/admin.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtGuard } from './guards/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, KeysEntity]),
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
  providers: [AuthService, AdminGuard, ApiKeyGuard, JwtGuard],
  exports: [AuthService, ApiKeyGuard, JwtGuard],
})
export class AuthModule {}
