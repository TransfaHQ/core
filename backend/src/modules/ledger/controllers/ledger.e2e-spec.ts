import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setupTestApp } from '@src/setup-test';

import { setTestBasicAuthHeader } from '@libs/utils/tests';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

import { LedgerService } from '../services/ledger.service';

describe('LedgerController', () => {
  let app: INestApplication<App>;
  let ledgerRepository: Repository<LedgerEntity>;
  let ledgerMetadataRepository: Repository<LedgerMetadataEntity>;
  let authKey: KeyResponseDto;

  beforeAll(async () => {
    app = await setupTestApp()!;

    const authService = app.get(AuthService);
    authKey = await authService.createKey({});

    ledgerRepository = app.get(getRepositoryToken(LedgerEntity));
    ledgerMetadataRepository = app.get(getRepositoryToken(LedgerMetadataEntity));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/ledgers', () => {
    it('should return 401 when auth is not provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 when ledger name is not provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description: 'test' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 200 when ledger name provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description: 'test', name: 'test' })
        .expect(HttpStatus.CREATED)
        .expect(async (response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.metadata).toMatchObject({});
          expect(response.body.createdAt).toBeDefined();
          expect(response.body.updatedAt).toBeDefined();

          const ledger = await ledgerRepository.findOne({ where: { id: response.body.id } });
          expect(ledger!.name).toBe('test');
          expect(ledger!.description).toBe('test');
        });
    });

    it('should save metadata', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description: 'test', name: 'test', metadata: { key: 'value' } })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.metadata).toMatchObject({ key: 'value' });
        });
    });

    it('should not accept invalid data', async () => {
      await request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 1 })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'na' })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'nan', description: '1' })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'nan', description: '123', metadata: { test: 1 } })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/ledgers', () => {
    it('should list ledgers', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledgers')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger when limit = 1', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledgers')
        .query({ limit: 1 })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length).toBe(1);
        });
    });
  });

  describe('GET /v1/ledgers/:id', () => {
    let ledger: LedgerEntity;
    beforeAll(async () => {
      const ledgerService = app.get(LedgerService);
      ledger = await ledgerService.createLedger({
        name: 'Test Ledger',
        description: 'Test',
        metadata: {},
      });
    });
    it('should return 202', async () => {
      return request(app.getHttpServer())
        .get(`/v1/ledgers/${ledger.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(ledger.id);
          expect(response.body.name).toBe('Test Ledger');
          expect(response.body.description).toBe('Test');
        });
    });
  });

  describe('PATCH /v1/ledgers/:id', () => {
    let ledger: LedgerEntity;
    beforeAll(async () => {
      const ledgerService = app.get(LedgerService);
      ledger = await ledgerService.createLedger({
        name: 'Test Ledger',
        description: 'Test',
        metadata: {},
      });
    });
    it('should return 200', async () => {
      const ledgerBeforeUpdate = await ledgerRepository.findOneBy({ id: ledger.id });
      const name = 'Transfa Ledger';

      await request(app.getHttpServer())
        .patch(`/v1/ledgers/${ledger.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.name).toBe(name);
        });

      const ledgerAfterUpdate = await ledgerRepository.findOneBy({ id: ledger.id });
      expect(ledgerAfterUpdate!.name).not.toBe(ledgerBeforeUpdate!.name);
      expect(ledgerAfterUpdate!.name).toBe(name);
    });

    it('should update description & metadata', async () => {
      const ledgerBeforeUpdate = await ledgerRepository.findOneBy({ id: ledger.id });
      const description = 'Transfa Ledger';
      const metadata = { test: 'value' };

      await request(app.getHttpServer())
        .patch(`/v1/ledgers/${ledger.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description, metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.description).toBe(description);
          expect(response.body.metadata).toMatchObject(metadata);
        });

      const ledgerAfterUpdate = await ledgerRepository.findOneBy({ id: ledger.id });
      expect(ledgerAfterUpdate!.description).not.toBe(ledgerBeforeUpdate!.description);
      expect(ledgerAfterUpdate!.description).toBe(description);

      expect(
        await ledgerMetadataRepository.findOneBy({
          ledger: { id: ledger.id },
          key: 'test',
          value: 'value',
        }),
      ).toBeDefined();
    });

    it('should remove metadata', async () => {
      const metadata = { test: '' };
      expect(
        await ledgerMetadataRepository.findOneBy({
          ledger: { id: ledger.id },
          key: 'test',
        }),
      ).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/v1/ledgers/${ledger.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.metadata.test).toBeUndefined();
        });

      expect(
        await ledgerMetadataRepository.findOneBy({
          ledger: { id: ledger.id },
          key: 'test',
        }),
      ).toBeNull();
    });
  });
});
