import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import {
  Body,
  ClassSerializerInterceptor,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@libs/config/config.service';

import { CreateUserDto, UserResponseDto } from './dto';
import { UserEntity } from './entities/user.entity';
import { AdminGuard } from './guards/admin.guard';

@Controller({
  version: '1',
  path: 'auth',
})
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly config: ConfigService,
  ) {}

  @Post('user')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body()
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const { email, password } = createUserDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('email_already_exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.config.authSaltRounds);

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      email: savedUser.email,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }
}
