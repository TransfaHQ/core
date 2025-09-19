import type { Request } from 'express';

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload } from '../types';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      request['user'] = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
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
}
