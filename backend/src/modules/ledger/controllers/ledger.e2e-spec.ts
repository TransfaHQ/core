import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setTestBasicAuthHeader } from '@libs/utils/tests';

import { LedgerMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';

describe('LedgerController', () => {
  let app: INestApplication<App>;
  let ledgerRepository: Repository<LedgerEntity>;
  let ledgerMetadataRepository: Repository<LedgerMetadataEntity>;

  beforeAll(() => {
    app = __TEST_APP__!;
    ledgerRepository = app.get(getRepositoryToken(LedgerEntity));
    ledgerMetadataRepository = app.get(getRepositoryToken(LedgerMetadataEntity));
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
        .set(setTestBasicAuthHeader())
        .send({ description: 'test' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 200 when ledger name provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setTestBasicAuthHeader())
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
        .set(setTestBasicAuthHeader())
        .send({ description: 'test', name: 'test', metadata: { key: 'value' } })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.metadata).toMatchObject({ key: 'value' });
        });
    });
  });

  describe('GET /v1/ledgers', () => {
    it('should list ledgers', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledgers')
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger when limit = 1', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledgers')
        .query({ limit: 1 })
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length).toBe(1);
        });
    });
  });

  describe('GET /v1/ledgers/:id', () => {
    it('should return 202', async () => {
      return request(app.getHttpServer())
        .get(`/v1/ledgers/${__TEST_LEDGER_ID__}`)
        .set(setTestBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(__TEST_LEDGER_ID__);
          expect(response.body.name).toBe('Test Ledger');
          expect(response.body.description).toBe('Test');
        });
    });
  });

  describe('PATCH /v1/ledgers/:id', () => {
    it('should return 200', async () => {
      const ledgerBeforeUpdate = await ledgerRepository.findOneBy({ id: __TEST_LEDGER_ID__ });
      const name = 'Transfa Ledger';

      await request(app.getHttpServer())
        .patch(`/v1/ledgers/${__TEST_LEDGER_ID__}`)
        .set(setTestBasicAuthHeader())
        .send({ name })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.name).toBe(name);
        });

      const ledgerAfterUpdate = await ledgerRepository.findOneBy({ id: __TEST_LEDGER_ID__ });
      expect(ledgerAfterUpdate!.name).not.toBe(ledgerBeforeUpdate!.name);
      expect(ledgerAfterUpdate!.name).toBe(name);
    });

    it('should update description & metadata', async () => {
      const ledgerBeforeUpdate = await ledgerRepository.findOneBy({ id: __TEST_LEDGER_ID__ });
      const description = 'Transfa Ledger';
      const metadata = { test: 'value' };

      await request(app.getHttpServer())
        .patch(`/v1/ledgers/${__TEST_LEDGER_ID__}`)
        .set(setTestBasicAuthHeader())
        .send({ description, metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.description).toBe(description);
          expect(response.body.metadata).toMatchObject(metadata);
        });

      const ledgerAfterUpdate = await ledgerRepository.findOneBy({ id: __TEST_LEDGER_ID__ });
      expect(ledgerAfterUpdate!.description).not.toBe(ledgerBeforeUpdate!.description);
      expect(ledgerAfterUpdate!.description).toBe(description);

      // Make sure metadata are saved in DB
      expect(
        await ledgerMetadataRepository.findOneBy({
          ledger: { id: __TEST_LEDGER_ID__ },
          key: 'test',
          value: 'value',
        }),
      ).toBeDefined();
    });
  });
});
