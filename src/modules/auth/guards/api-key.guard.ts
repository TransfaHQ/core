import type { Request } from 'express';

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const credentials = this.extractBasicAuthCredentials(request);

    if (!credentials) {
      throw new UnauthorizedException('API key authentication required');
    }

    const { keyId, secret } = credentials;

    try {
      const key = await this.authService.validateApiKey(keyId, secret);

      if (!key) {
        throw new UnauthorizedException('Invalid API key');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Invalid API key');
    }
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