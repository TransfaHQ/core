import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setTestBasicAuthHeader } from '@libs/utils/tests';

import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

describe('LedgerAccountController', () => {
  let app: INestApplication<App>;
  let ledgerRepository: Repository<LedgerEntity>;
  let ledgerMetadataRepository: Repository<LedgerMetadataEntity>;

  beforeAll(() => {
    app = __TEST_APP__!;
    ledgerRepository = app.get(getRepositoryToken(LedgerEntity));
    ledgerMetadataRepository = app.get(getRepositoryToken(LedgerMetadataEntity));
  });

  describe('POST /v1/ledger_accounts', () => {
    it('should return 401 when auth is not provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /v1/ledger_accounts', () => {
    it('should list ledger accounts', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger when limit = 1', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledger_accounts')
        .query({ limit: 1 })
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length).toBe(1);
        });
    });
  });

  describe('GET /v1/ledger_accounts/:id', () => {
    it('should return 202', async () => {
      return request(app.getHttpServer())
        .get(`/v1/ledger_accounts/${__TEST_CREDIT_LEDGER_ACCOUNT_ID__}`)
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(__TEST_CREDIT_LEDGER_ACCOUNT_ID__);
          expect(response.body.name).toBe('credit account');
          expect(response.body.description).toBe('test');
        });
    });
  });

  describe('PATCH /v1/ledger_accounts/:id', () => {
    it('should return 200', async () => {});
  });
});
