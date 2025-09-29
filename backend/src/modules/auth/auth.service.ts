import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Request } from 'express';
import ms, { StringValue } from 'ms';
import { PinoLogger } from 'nestjs-pino';

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { ConfigService } from '@libs/config/config.service';
import { DatabaseService } from '@libs/database/database.service';

import { CreateKeyDto, CreateUserDto, KeyResponseDto, LoginDto, UserResponseDto } from './dto';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
    private readonly db: DatabaseService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password } = createUserDto;

    const existingUser = await this.db.kysely
      .selectFrom('users')
      .select(['id'])
      .where('email', '=', email)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (existingUser) {
      throw new ConflictException('email_already_exists');
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await this.db.kysely
      .insertInto('users')
      .values({
        email,
        password: hashedPassword,
        isActive: true,
      })
      .returning(['id', 'email', 'createdAt', 'updatedAt'])
      .executeTakeFirstOrThrow();

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.config.authSaltRounds);
  }

  async login(loginDto: LoginDto): Promise<{ token: string; cookieOptions: any }> {
    const { email, password } = loginDto;

    const user = await this.db.kysely
      .selectFrom('users')
      .select(['id', 'email', 'password', 'isActive'])
      .where('email', '=', email)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

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

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      maxAge: ms(this.config.jwtExpiresIn as StringValue),
    };

    return {
      token: accessToken,
      cookieOptions,
    };
  }

  async createKey(_: CreateKeyDto): Promise<KeyResponseDto> {
    const generatedSecret = crypto.randomBytes(32).toString('base64url');

    const hashedSecret = crypto.createHash('sha256').update(generatedSecret).digest('hex');

    const key = await this.db.kysely
      .insertInto('keys')
      .values({
        secret: hashedSecret,
      })
      .returning(['id', 'createdAt', 'updatedAt'])
      .executeTakeFirstOrThrow();

    return {
      id: key.id,
      secret: generatedSecret,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }

  async deleteKey(id: string): Promise<void> {
    const result = await this.db.kysely
      .updateTable('keys')
      .set({
        deletedAt: new Date(),
      })
      .where('id', '=', id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      throw new NotFoundException('Key not found');
    }
  }

  async validateApiKey(id: string, secret: string): Promise<any | null> {
    const key = await this.db.kysely
      .selectFrom('keys')
      .select(['id', 'secret', 'createdAt', 'updatedAt'])
      .where('id', '=', id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!key) {
      return null;
    }
    const providedHash = crypto.createHash('sha256').update(secret).digest('hex');
    const isSecretValid = crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(key.secret),
    );
    if (!isSecretValid) {
      return null;
    }

    return key;
  }

  async verifyJwtRequest(request: Request) {
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      this.logger.warn('JWT authentication failed: No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwtSecret,
      });

      this.logger.debug(`JWT authentication successful for user: ${payload.sub}`, {
        userId: payload.sub,
      });

      return true;
    } catch (error) {
      this.logger.error(error, 'JWT authentication failed: Invalid token');
      throw new UnauthorizedException('Invalid token');
    }
  }
  async verifyApiKeyRequest(request: Request) {
    const credentials = this.extractBasicAuthCredentials(request);

    if (!credentials) {
      throw new UnauthorizedException('API key authentication required');
    }

    const { keyId, secret } = credentials;

    try {
      const key = await this.validateApiKey(keyId, secret);

      if (!key) {
        this.logger.warn('Invalid API key');
        throw new UnauthorizedException('Invalid API Key');
      }

      return true;
    } catch {
      this.logger.info('API key validation failed');
      throw new UnauthorizedException('API key validation failed');
    }
  }
  private extractTokenFromRequest(request: Request): string | undefined {
    // First, try to extract from Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Second, try to extract from cookies
    const cookieToken = request.cookies?.access_token as string;
    if (cookieToken) {
      return cookieToken;
    }

    return undefined;
  }

  private extractBasicAuthCredentials(request: Request): { keyId: string; secret: string } | null {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }

    try {
      const base64Credentials = authHeader.substring(6); // Remove 'Basic ' prefix
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [keyId, secret] = credentials.split(':');

      if (!keyId || !secret) {
        return null;
      }

      return { keyId, secret };
    } catch {
      return null;
    }
  }
}
