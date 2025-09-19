import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppStatus(): { status: string } {
    return { status: 'ok' };
  }
}
