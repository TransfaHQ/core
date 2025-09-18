import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule } from '@libs/config/config.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard],
  exports: [AuthService],
})
export class AuthModule {}
