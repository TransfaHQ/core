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
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@libs/config/config.service';

import { AuthService } from './auth.service';
import {
  CreateKeyDto,
  CreateUserDto,
  DeleteKeyDto,
  KeyResponseDto,
  LoginDto,
  LoginResponseDto,
  UserResponseDto,
} from './dto';
import { UserEntity } from './entities/user.entity';
import { AdminGuard } from './guards/admin.guard';
import { JwtPayload } from './types';

@ApiTags('Auth')
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

  @Post('users')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
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
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Create API key' })
  @ApiBody({ type: CreateKeyDto })
  @ApiResponse({ status: 201, description: 'Key created successfully', type: KeyResponseDto })
  async createKey(
    @Body()
    createKeyDto: CreateKeyDto,
  ): Promise<KeyResponseDto> {
    return this.authService.createKey(createKeyDto);
  }

  @Delete('keys')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiBody({ type: DeleteKeyDto })
  @ApiResponse({ status: 204, description: 'Key deleted successfully' })
  async deleteKey(
    @Body()
    deleteKeyDto: DeleteKeyDto,
  ): Promise<void> {
    return this.authService.deleteKey(deleteKeyDto.id);
  }
}
