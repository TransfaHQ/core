import request from 'supertest';
import { App } from 'supertest/types';
import { AccountFlags } from 'tigerbeetle-node';
import { Repository } from 'typeorm';

import { HttpStatus, INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setupTestApp } from '@src/setup-test';

import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { KeyResponseDto } from '@modules/auth/dto';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { loadLedgerModuleFixtures } from '@modules/ledger/tests';

describe('LedgerAccountController', () => {
  let app: INestApplication<App>;
  let ledgerAccountRepository: Repository<LedgerAccountEntity>;
  let ledgerAccountMetadataRepository: Repository<LedgerAccountMetadataEntity>;
  let tigerBeetleService: TigerBeetleService;
  let authKey: KeyResponseDto;
  let ledger: LedgerEntity;
  let creditLedgerAccount: LedgerAccountEntity;
  let secondLedger: LedgerEntity;
  let eurAccount: LedgerAccountEntity;

  beforeAll(async () => {
    app = await setupTestApp()!;
    const response = await loadLedgerModuleFixtures(app);

    authKey = response.authKey;
    creditLedgerAccount = response.creditLedgerAccount;
    ledger = response.ledger;

    ledgerAccountRepository = app.get(getRepositoryToken(LedgerAccountEntity));
    ledgerAccountMetadataRepository = app.get(getRepositoryToken(LedgerAccountMetadataEntity));
    tigerBeetleService = app.get(TigerBeetleService);

    // Set up additional test data for filtering tests
    const ledgerService = app.get(LedgerService);
    const ledgerAccountService = app.get(LedgerAccountService);
    const currencyService = app.get(CurrencyService);

    // Create a second ledger
    secondLedger = await ledgerService.createLedger({
      name: 'Second Test Ledger',
      description: 'Second ledger for filtering tests',
      metadata: {},
    });

    // Get EUR currency
    const eurCurrency = await currencyService.findByCode('EUR');

    // Create an account with EUR currency
    eurAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'EUR Test Account',
      description: 'Account for EUR currency testing',
      normalBalance: NormalBalanceEnum.CREDIT,
      currency: eurCurrency.code,
      externalId: uuidV7(),
    });

    // Create a debit account
    await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'Debit Test Account',
      description: 'Account for debit balance testing',
      normalBalance: NormalBalanceEnum.DEBIT,
      currency: 'USD',
      externalId: uuidV7(),
    });

    // Create an account with metadata
    await ledgerAccountService.createLedgerAccount({
      ledgerId: secondLedger.id,
      name: 'Metadata Test Account',
      description: 'Account for metadata testing',
      normalBalance: NormalBalanceEnum.CREDIT,
      currency: 'USD',
      externalId: uuidV7(),
      metadata: {
        department: 'finance',
        region: 'US',
        type: 'operational',
      },
    });
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
      const currency = await app.get(CurrencyService).findByCode('USD')!;
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
            currencyExponent: currency.exponent,
          });

          expect(response.body.balances.avalaibleBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.exponent,
          });

          expect(response.body.balances.postedBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.exponent,
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
      expect(tbAccount.code).toBe(+currency.id);
      expect(tbAccount.user_data_32).toBe(1);
      expect(tbAccount.flags).toBe(AccountFlags.debits_must_not_exceed_credits);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
    });

    it('should create debit ledger account', async () => {
      const currency = await app.get(CurrencyService).findByCode('USD')!;
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
            currencyExponent: currency.exponent,
          });

          expect(response.body.balances.avalaibleBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.exponent,
          });

          expect(response.body.balances.postedBalance).toMatchObject({
            credits: 0,
            debits: 0,
            amount: 0,
            currency: currency.code,
            currencyExponent: currency.exponent,
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
      expect(tbAccount.code).toBe(+currency.id);
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

  describe('GET /v1/ledger_accounts - Filtering', () => {
    describe('Filter by ledger_id', () => {
      it('should filter accounts by ledger_id', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ ledger_id: ledger.id })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((account: any) => {
              expect(account.ledgerId).toBe(ledger.id);
            });
          });
      });

      it('should filter accounts by second ledger_id', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ ledger_id: secondLedger.id })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].ledgerId).toBe(secondLedger.id);
            expect(response.body.data[0].name).toBe('Metadata Test Account');
          });
      });

      it('should return empty array for non-existent ledger_id', async () => {
        const nonExistentId = uuidV7();
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ ledger_id: nonExistentId })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });
    });

    describe('Filter by currency', () => {
      it('should filter accounts by USD currency', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ currency: 'USD' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((account: any) => {
              expect(account.balances.pendingBalance.currency).toBe('USD');
            });
          });
      });

      it('should filter accounts by EUR currency', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ currency: 'EUR' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].balances.pendingBalance.currency).toBe('EUR');
            expect(response.body.data[0].name).toBe('EUR Test Account');
          });
      });

      it('should return empty array for non-existent currency', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ currency: 'JPY' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });
    });

    describe('Filter by normal_balance', () => {
      it('should filter accounts by credit normal_balance', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ normal_balance: 'credit' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((account: any) => {
              expect(account.normalBalance).toBe('credit');
            });
          });
      });

      it('should filter accounts by debit normal_balance', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ normal_balance: 'debit' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].normalBalance).toBe('debit');
            expect(response.body.data[0].name).toBe('Debit Test Account');
          });
      });
    });

    describe('Search functionality', () => {
      it('should search by account name (case insensitive)', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'eur test' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].name.toLowerCase()).toContain('eur test');
          });
      });

      it('should search by account description', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'metadata testing' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].description.toLowerCase()).toContain('metadata testing');
          });
      });

      it('should search by partial name match', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'credit' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            const found = response.body.data.some((account: any) =>
              account.name.toLowerCase().includes('credit')
            );
            expect(found).toBe(true);
          });
      });

      it('should search by external ID', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: eurAccount.externalId })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].externalId).toBe(eurAccount.externalId);
          });
      });

      it('should return empty array for non-matching search term', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'nonexistentaccountname' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });
    });

    describe('Metadata filtering', () => {
      it('should filter by single metadata key-value pair', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ 'metadata[department]': 'finance' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].metadata.department).toBe('finance');
            expect(response.body.data[0].name).toBe('Metadata Test Account');
          });
      });

      it('should filter by multiple metadata key-value pairs', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            'metadata[department]': 'finance',
            'metadata[region]': 'US'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].metadata.department).toBe('finance');
            expect(response.body.data[0].metadata.region).toBe('US');
          });
      });

      it('should return empty array when metadata does not match', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ 'metadata[department]': 'marketing' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });

      it('should return empty array when partial metadata match fails', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            'metadata[department]': 'finance',
            'metadata[region]': 'EU'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });
    });

    describe('Combined filters', () => {
      it('should combine ledger_id and currency filters', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: ledger.id,
            currency: 'EUR'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].ledgerId).toBe(ledger.id);
            expect(response.body.data[0].balances.pendingBalance.currency).toBe('EUR');
          });
      });

      it('should combine normal_balance and currency filters', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            normal_balance: 'debit',
            currency: 'USD'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].normalBalance).toBe('debit');
            expect(response.body.data[0].balances.pendingBalance.currency).toBe('USD');
          });
      });

      it('should combine search with ledger_id filter', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: secondLedger.id,
            search: 'metadata'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].ledgerId).toBe(secondLedger.id);
            expect(response.body.data[0].name.toLowerCase()).toContain('metadata');
          });
      });

      it('should combine metadata filter with ledger_id', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: secondLedger.id,
            'metadata[type]': 'operational'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            expect(response.body.data[0].ledgerId).toBe(secondLedger.id);
            expect(response.body.data[0].metadata.type).toBe('operational');
          });
      });

      it('should return empty array when combined filters do not match', async () => {
        return request(app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: ledger.id,
            'metadata[department]': 'finance'
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
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
