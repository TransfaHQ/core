import request from 'supertest';
import { App } from 'supertest/types';

import { HttpStatus, INestApplication } from '@nestjs/common';

const setBasicAuthHeader = () => {
  const credentials = `${__TEST_CORE_API_KEY__}:${__TEST_CORE_API_SECRET__}`;
  const base64Credentials = Buffer.from(credentials, 'utf-8').toString('base64');
  return {
    Authorization: `Basic ${base64Credentials}`,
  };
};

describe('LedgerController', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    app = __TEST_APP__!;
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
        .set(setBasicAuthHeader())
        .send({ description: 'test' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 200 when ledger name provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setBasicAuthHeader())
        .send({ description: 'test', name: 'test' })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.id).toBeDefined();
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.metadata).toMatchObject({});
        });
    });

    it('should save metadata', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledgers')
        .set(setBasicAuthHeader())
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
        .set(setBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger when limit = 1', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledgers')
        .query({ limit: 1 })
        .set(setBasicAuthHeader())
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
        .set(setBasicAuthHeader())
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(__TEST_LEDGER_ID__);
          expect(response.body.name).toBe('Test Ledger');
          expect(response.body.description).toBe('Test');
        });
    });
  });

  describe('PUT /v1/ledgers/:id', () => {
    it('should return 202', async () => {});
  });
});
