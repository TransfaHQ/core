import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Request } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { ConfigService } from '@libs/config/config.service';

import { CreateKeyDto, KeyResponseDto } from './dto';
import { KeysEntity } from './entities/keys.entity';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(KeysEntity)
    private readonly keysRepository: Repository<KeysEntity>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async createKey(_: CreateKeyDto): Promise<KeyResponseDto> {
    const generatedSecret = crypto.randomBytes(32).toString('base64url');

    const hashedSecret = await bcrypt.hash(generatedSecret, this.config.authSaltRounds);

    const key = this.keysRepository.create({
      secret: hashedSecret,
    });

    const savedKey = await this.keysRepository.save(key);

    return {
      id: savedKey.id,
      secret: generatedSecret,
      createdAt: savedKey.createdAt,
      updatedAt: savedKey.updatedAt,
    };
  }

  async deleteKey(id: string): Promise<void> {
    const key = await this.keysRepository.findOne({
      where: { id },
    });

    if (!key) {
      throw new NotFoundException('Key not found');
    }

    await this.keysRepository.softDelete(id);
  }

  async validateApiKey(id: string, secret: string): Promise<KeysEntity | null> {
    const key = await this.keysRepository.findOne({
      where: { id },
    });

    if (!key) {
      return null;
    }

    const isSecretValid = await bcrypt.compare(secret, key.secret);
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
