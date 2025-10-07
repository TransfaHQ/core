import type { Response } from 'express';

import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
import { AdminGuard } from './guards/admin.guard';

@ApiTags('Auth')
@Controller({
  version: '1',
  path: 'auth',
})
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiHeader({
    name: 'x-admin-key',
    description: 'Admin secret key passed as environment variable',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.authService.createUser(createUserDto);
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
    const { token, cookieOptions } = await this.authService.login(loginDto);

    response.cookie('access_token', token, cookieOptions);

    return {
      token,
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
