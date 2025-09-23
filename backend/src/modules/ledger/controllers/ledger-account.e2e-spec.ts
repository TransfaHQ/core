import request from 'supertest';
import { App } from 'supertest/types';
import { AccountFlags } from 'tigerbeetle-node';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setupTestApp } from '@src/setup-test';

import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { getCurrency } from '@libs/utils/currency';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { KeyResponseDto } from '@modules/auth/dto';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { loadLedgerModuleFixtures } from '@modules/ledger/tests';

describe('LedgerAccountController', () => {
  let app: INestApplication<App>;
  let ledgerAccountRepository: Repository<LedgerAccountEntity>;
  let ledgerAccountMetadataRepository: Repository<LedgerAccountMetadataEntity>;
  let tigerBeetleService: TigerBeetleService;
  let authKey: KeyResponseDto;
  let ledger: LedgerEntity;
  let creditLedgerAccount: LedgerAccountEntity;

  beforeAll(async () => {
    app = await setupTestApp()!;
    const response = await loadLedgerModuleFixtures(app);

    authKey = response.authKey;
    creditLedgerAccount = response.creditLedgerAccount;
    ledger = response.ledger;

    ledgerAccountRepository = app.get(getRepositoryToken(LedgerAccountEntity));
    ledgerAccountMetadataRepository = app.get(getRepositoryToken(LedgerAccountMetadataEntity));
    tigerBeetleService = app.get(TigerBeetleService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/ledger_accounts', () => {
    it('should return 401 when auth is not provided', async () => {
      return request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should create credit ledger account', async () => {
      const currency = getCurrency('USD')!;
      let accountId: string = '';
      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: 'test',
          description: 'test',
          ledgerId: ledger.id,
          currency: currency.code,
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.ledgerId).toBe(ledger.id);
          expect(response.body.createdAt).toBeDefined();
          expect(response.body.updatedAt).toBeDefined();
          expect(response.body.balances.pendingBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });

          expect(response.body.balances.avalaibleBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });

          expect(response.body.balances.postedBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });
          accountId = response.body.id;
        });

      // Make sure it is saved in DB
      const account = await ledgerAccountRepository.findOneOrFail({
        where: { id: accountId },
        relations: ['ledger'],
      });

      expect(account).toBeDefined();

      // Make sure that account is created in TigerBeetle
      const tbAccount = await tigerBeetleService.retrieveAccount(account.tigerBeetleId);

      expect(tbAccount.ledger).toEqual(account.ledger.tigerBeetleId);
      expect(tbAccount.code).toBe(+currency.number);
      expect(tbAccount.user_data_32).toBe(1);
      expect(tbAccount.flags).toBe(AccountFlags.debits_must_not_exceed_credits);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
    });

    it('should create debit ledger account', async () => {
      const currency = getCurrency('USD')!;
      const externalId = uuidV7();

      let accountId: string = '';
      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: 'test',
          description: 'test',
          ledgerId: ledger.id,
          currency: currency.code,
          normalBalance: NormalBalanceEnum.DEBIT,
          externalId,
        })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.ledgerId).toBe(ledger.id);
          expect(response.body.createdAt).toBeDefined();
          expect(response.body.updatedAt).toBeDefined();
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.balances.pendingBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });

          expect(response.body.balances.avalaibleBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });

          expect(response.body.balances.postedBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.digits,
          });
          accountId = response.body.id;
        });

      // Make sure it is saved in DB
      const account = await ledgerAccountRepository.findOneOrFail({
        where: { id: accountId },
        relations: ['ledger'],
      });

      expect(account).toBeDefined();

      // Make sure that account is created in TigerBeetle
      const tbAccount = await tigerBeetleService.retrieveAccount(account.tigerBeetleId);

      expect(tbAccount.ledger).toEqual(account.ledger.tigerBeetleId);
      expect(tbAccount.code).toBe(+currency.number);
      expect(tbAccount.user_data_32).toBe(0);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
      expect(tbAccount.flags).toBe(AccountFlags.credits_must_not_exceed_debits);
    });

    it('should not accept invalid data', async () => {
      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: 1,
          description: 'tes',
          ledgerId: ledger.id,
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: '21',
          description: 'tes',
          ledgerId: ledger.id,
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: '21',
          description: '1',
          ledgerId: ledger.id,
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.BAD_REQUEST);

      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: '21',
          description: '1',
          ledgerId: '123',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /v1/ledger_accounts', () => {
    it('should list ledger accounts', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger when limit = 1', async () => {
      return request(app.getHttpServer())
        .get('/v1/ledger_accounts')
        .query({ limit: 1 })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length).toBe(1);
        });
    });
  });

  describe('GET /v1/ledger_accounts/:id', () => {
    it('should return 202', async () => {
      return request(app.getHttpServer())
        .get(`/v1/ledger_accounts/${creditLedgerAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(creditLedgerAccount.id);
          expect(response.body.name).toBe('credit account');
          expect(response.body.description).toBe('test');
        });
    });

    it('should retrieve using externalId', async () => {
      return request(app.getHttpServer())
        .get(`/v1/ledger_accounts/${creditLedgerAccount.externalId}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(creditLedgerAccount.id);
          expect(response.body.name).toBe('credit account');
          expect(response.body.description).toBe('test');
          expect(response.body.externalId).toBe(creditLedgerAccount.externalId);
        });
    });
  });

  describe('PATCH /v1/ledger_accounts/:id', () => {
    it('should return 200', async () => {
      const beforeUpdate = await ledgerAccountRepository.findOneBy({
        id: creditLedgerAccount.id,
      });
      expect(beforeUpdate!.name).toBe('credit account');

      await request(app.getHttpServer())
        .patch(`/v1/ledger_accounts/${creditLedgerAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: 'test',
          description: 'description',
          metadata: {
            test: 'transfa',
          },
        })
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(creditLedgerAccount.id);
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('description');
          expect(response.body.metadata.test).toBe('transfa');
        });

      const afterUpdate = (await ledgerAccountRepository.findOneBy({
        id: creditLedgerAccount.id,
      }))!;

      expect(afterUpdate.name).toBe('test');
      expect(afterUpdate.description).toBe('description');
    });

    it('should update description & metadata', async () => {
      const beforeUpdate = await ledgerAccountRepository.findOneBy({
        id: creditLedgerAccount.id,
      });
      const description = 'Transfa Ledger';
      const metadata = { test: 'value' };

      await request(app.getHttpServer())
        .patch(`/v1/ledger_accounts/${creditLedgerAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description, metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.description).toBe(description);
          expect(response.body.metadata).toMatchObject(metadata);
        });

      const ledgerAfterUpdate = await ledgerAccountRepository.findOneBy({
        id: creditLedgerAccount.id,
      });
      expect(ledgerAfterUpdate!.description).not.toBe(beforeUpdate!.description);
      expect(ledgerAfterUpdate!.description).toBe(description);

      // Make sure metadata are saved in DB
      expect(
        await ledgerAccountMetadataRepository.findOneBy({
          ledgerAccount: { id: creditLedgerAccount.id },
          key: 'test',
          value: 'value',
        }),
      ).toBeDefined();
    });

    it('should remove metadata', async () => {
      const metadata = { test: '' };
      // Make sure metadata are saved in DB
      expect(
        await ledgerAccountMetadataRepository.findOneBy({
          ledgerAccount: { id: creditLedgerAccount.id },
          key: 'test',
        }),
      ).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/v1/ledger_accounts/${creditLedgerAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.metadata.test).toBeUndefined();
        });

      // Make sure metadata are saved in DB
      expect(
        await ledgerAccountMetadataRepository.findOneBy({
          ledgerAccount: { id: creditLedgerAccount.id },
          key: 'test',
        }),
      ).toBeNull();
    });
  });
});
