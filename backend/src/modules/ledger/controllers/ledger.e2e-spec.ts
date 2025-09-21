import { App } from 'supertest/types';
import { Repository } from 'typeorm';

import { INestApplication } from '@nestjs/common';

import { ConfigService } from '@libs/config/config.service';

import { KeysEntity } from '@modules/auth/entities/keys.entity';
import { UserEntity } from '@modules/auth/entities/user.entity';

describe('LedgerController', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<UserEntity>;
  let keysRepository: Repository<KeysEntity>;
  let configService: ConfigService;
  let adminSecret: string;

  describe('GET /v1/ledgers', () => {
    it('should return 200', async () => {});
  });

  describe('POST /v1/ledgers', () => {
    it('should return 201', async () => {});
  });

  describe('PUT /v1/ledgers/:id', () => {
    it('should return 202', async () => {});
  });
});
