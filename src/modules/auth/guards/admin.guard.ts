import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

import { ConfigService } from '@libs/config/config.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const adminKey = request.headers['x-admin-key'] as string;

    if (!adminKey) {
      throw new UnauthorizedException('Admin key is required');
    }

    const expectedAdminSecret = this.configService.adminSecret;

    if (adminKey !== expectedAdminSecret) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}