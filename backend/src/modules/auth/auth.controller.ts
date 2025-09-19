import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import ms, { StringValue } from 'ms';
import { Repository } from 'typeorm';

import {
  Body,
  ClassSerializerInterceptor,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@libs/config/config.service';

import { AuthService } from './auth.service';
import { CreateKeyDto, CreateUserDto, DeleteKeyDto, KeyResponseDto, LoginDto, LoginResponseDto, UserResponseDto } from './dto';
import { UserEntity } from './entities/user.entity';
import { AdminGuard } from './guards/admin.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtPayload } from './types';

@Controller({
  version: '1',
  path: 'auth',
})
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id.toString(),
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: ms(this.config.jwtExpiresIn as StringValue),
    });

    return {
      token: accessToken,
    };
  }

  @Post('keys')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  async createKey(
    @Body()
    createKeyDto: CreateKeyDto,
  ): Promise<KeyResponseDto> {
    return this.authService.createKey(createKeyDto);
  }

  @Delete('keys')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(
    @Body()
    deleteKeyDto: DeleteKeyDto,
  ): Promise<void> {
    return this.authService.deleteKey(deleteKeyDto.id);
  }

}
