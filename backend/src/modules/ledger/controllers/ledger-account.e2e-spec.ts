import request from 'supertest';
import { App } from 'supertest/types';
import { AccountFlags } from 'tigerbeetle-node';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { getCurrency } from '@libs/utils/currency';
import { setTestBasicAuthHeader } from '@libs/utils/tests';

import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';

describe('LedgerAccountController', () => {
  let app: INestApplication<App>;
  let ledgerAccountRepository: Repository<LedgerAccountEntity>;
  let ledgerAccountMetadataRepository: Repository<LedgerAccountMetadataEntity>;
  let tigerBeetleService: TigerBeetleService;

  beforeAll(() => {
    app = __TEST_APP__!;
    ledgerAccountRepository = app.get(getRepositoryToken(LedgerAccountEntity));
    ledgerAccountMetadataRepository = app.get(getRepositoryToken(LedgerAccountMetadataEntity));
    tigerBeetleService = app.get(TigerBeetleService);
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
        .set(setTestBasicAuthHeader())
        .send({
          name: 'test',
          description: 'test',
          ledgerId: __TEST_LEDGER_ID__,
          currency: currency.code,
          normalBalance: NormalBalanceEnum.CREDIT,
        })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.ledgerId).toBe(__TEST_LEDGER_ID__);
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
      const tbAccount = await tigerBeetleService.retrieveAccount(account!.tigerBeetleId);

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

      let accountId: string = '';
      await request(app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader())
        .send({
          name: 'test',
          description: 'test',
          ledgerId: __TEST_LEDGER_ID__,
          currency: currency.code,
          normalBalance: NormalBalanceEnum.DEBIT,
        })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('test');
          expect(response.body.ledgerId).toBe(__TEST_LEDGER_ID__);
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
      const tbAccount = await tigerBeetleService.retrieveAccount(account!.tigerBeetleId);

      expect(tbAccount.ledger).toEqual(account.ledger.tigerBeetleId);
      expect(tbAccount.code).toBe(+currency.number);
      expect(tbAccount.user_data_32).toBe(0);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
      expect(tbAccount.flags).toBe(AccountFlags.credits_must_not_exceed_debits);
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
