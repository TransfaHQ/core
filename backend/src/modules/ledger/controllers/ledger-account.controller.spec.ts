import request from 'supertest';
import { AccountFlags } from 'tigerbeetle-node';

import { HttpStatus } from '@nestjs/common';

import { setupTestContext } from '@src/test/helpers';

import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';

import { Ledger, LedgerAccount } from '../types';

describe('LedgerAccountController', () => {
  const ctx = setupTestContext();
  let tigerBeetleService: TigerBeetleService;
  let authKey: KeyResponseDto;
  let ledger: Ledger;
  let secondLedger: Ledger;
  let eurAccount: LedgerAccount;
  let ledgerAccountService: LedgerAccountService;

  beforeAll(async () => {
    const authService = ctx.app.get(AuthService);
    authKey = await authService.createKey({});
    const ledgerService = ctx.app.get(LedgerService);
    ledger = await ledgerService.createLedger({
      name: 'Test Ledger',
      description: 'Test',
      metadata: {},
    });
    tigerBeetleService = ctx.app.get(TigerBeetleService);
    ledgerAccountService = ctx.app.get(LedgerAccountService);
  });

  describe('POST /v1/ledger_accounts', () => {
    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .post('/v1/ledger_accounts')
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should create credit ledger account', async () => {
      const currency = await ctx.app.get(CurrencyService).findByCode('USD');
      let accountId: string = '';
      await request(ctx.app.getHttpServer())
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
      const account = await ctx.trx
        .selectFrom('ledgerAccounts')
        .leftJoin('ledgers', 'ledgerAccounts.ledgerId', 'ledgers.id')
        .where('ledgerAccounts.id', '=', accountId)
        .select([
          'ledgerAccounts.id',
          'ledgerAccounts.tigerBeetleId',
          'ledgers.tigerBeetleId as ledgerTigerBeetleId',
        ])
        .executeTakeFirstOrThrow();

      expect(account).toBeDefined();

      // Make sure that account is created in TigerBeetle
      const tbAccount = await tigerBeetleService.retrieveAccount(account.tigerBeetleId);

      expect(tbAccount.ledger).toEqual(account.ledgerTigerBeetleId);
      expect(tbAccount.code).toBe(+currency.id);
      expect(tbAccount.user_data_32).toBe(1);
      expect(tbAccount.flags).toBe(AccountFlags.debits_must_not_exceed_credits);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
    });

    it('should create debit ledger account', async () => {
      const currency = await ctx.app.get(CurrencyService).findByCode('USD');
      const externalId = uuidV7();

      let accountId: string = '';
      await request(ctx.app.getHttpServer())
        .post('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({
          name: 'test',
          ledgerId: ledger.id,
          currency: currency.code,
          normalBalance: NormalBalanceEnum.DEBIT,
          externalId,
        })
        .expect(HttpStatus.CREATED)
        .expect((response) => {
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe(null);
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
      const account = await ctx.trx
        .selectFrom('ledgerAccounts')
        .leftJoin('ledgers', 'ledgerAccounts.ledgerId', 'ledgers.id')
        .where('ledgerAccounts.id', '=', accountId)
        .select([
          'ledgerAccounts.id',
          'ledgerAccounts.tigerBeetleId',
          'ledgers.tigerBeetleId as ledgerTigerBeetleId',
        ])
        .executeTakeFirstOrThrow();

      expect(account).toBeDefined();

      // Make sure that account is created in TigerBeetle
      const tbAccount = await tigerBeetleService.retrieveAccount(account.tigerBeetleId);

      expect(tbAccount.ledger).toEqual(account.ledgerTigerBeetleId);
      expect(tbAccount.code).toBe(+currency.id);
      expect(tbAccount.user_data_32).toBe(0);
      expect(tbAccount.credits_pending).toBe(0n);
      expect(tbAccount.debits_pending).toBe(0n);
      expect(tbAccount.credits_posted).toBe(0n);
      expect(tbAccount.debits_posted).toBe(0n);
      expect(tbAccount.flags).toBe(AccountFlags.credits_must_not_exceed_debits);
    });

    it('should not accept invalid data', async () => {
      await request(ctx.app.getHttpServer())
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

      await request(ctx.app.getHttpServer())
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

      await request(ctx.app.getHttpServer())
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

      await request(ctx.app.getHttpServer())
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
    beforeEach(async () => {
      await ledgerAccountService.createLedgerAccount({
        currency: 'USD',
        ledgerId: ledger.id,
        name: 'Ledger account',
        normalBalance: NormalBalanceEnum.CREDIT,
        description: '',
      });
    });
    it('should list ledger accounts', async () => {
      return request(ctx.app.getHttpServer())
        .get('/v1/ledger_accounts')
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.data.length > 0).toBeTruthy();
        });
    });

    it('should return only 1 ledger account when limit = 1', async () => {
      return request(ctx.app.getHttpServer())
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
    beforeEach(async () => {
      // Set up additional test data for filtering tests
      const ledgerService = ctx.app.get(LedgerService);
      const ledgerAccountService = ctx.app.get(LedgerAccountService);
      const currencyService = ctx.app.get(CurrencyService);

      // Create a second ledger
      secondLedger = await ledgerService.createLedger({
        name: 'Second Test Ledger',
        description: 'Second ledger for filtering tests',
        metadata: {},
      });

      const eurCurrency = await currencyService.findByCode('EUR');

      eurAccount = await ledgerAccountService.createLedgerAccount({
        ledgerId: ledger.id,
        name: 'EUR Test Account',
        description: 'Account for EUR currency testing',
        normalBalance: NormalBalanceEnum.CREDIT,
        currency: eurCurrency.code,
        externalId: uuidV7(),
      });

      await ledgerAccountService.createLedgerAccount({
        ledgerId: ledger.id,
        name: 'Debit Test Account',
        description: 'Account for debit balance testing',
        normalBalance: NormalBalanceEnum.DEBIT,
        currency: 'USD',
        externalId: uuidV7(),
      });

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

    describe('Filter by ledger_id', () => {
      it('should filter accounts by ledger_id', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ ledger_id: ledger.id })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toEqual(2);
            response.body.data.forEach((account: any) => {
              expect(account.ledgerId).toBe(ledger.id);
            });
          });
      });

      it('should filter accounts by second ledger_id', async () => {
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ currency: 'USD' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toEqual(2);
            response.body.data.forEach((account: any) => {
              expect(account.balances.pendingBalance.currency).toBe('USD');
            });
          });
      });

      it('should filter accounts by EUR currency', async () => {
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ normal_balance: 'credit' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(2);
            response.body.data.forEach((account: any) => {
              expect(account.normalBalance).toBe('credit');
            });
          });
      });

      it('should filter accounts by debit normal_balance', async () => {
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'debit' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBe(1);
            const found = response.body.data.some((account: any) =>
              account.name.toLowerCase().includes('debit'),
            );
            expect(found).toBe(true);
          });
      });

      it('should search by external ID', async () => {
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            'metadata[department]': 'finance',
            'metadata[region]': 'US',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ 'metadata[department]': 'marketing' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });

      it('should return empty array when partial metadata match fails', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            'metadata[department]': 'finance',
            'metadata[region]': 'EU',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: ledger.id,
            currency: 'EUR',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            normal_balance: 'debit',
            currency: 'USD',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: secondLedger.id,
            search: 'metadata',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: secondLedger.id,
            'metadata[type]': 'operational',
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
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: ledger.id,
            'metadata[department]': 'finance',
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
          });
      });
    });
  });

  describe('GET /v1/ledger_accounts - Pagination', () => {
    let secondLedgerForPagination: Ledger;

    // Helper function to create test accounts
    const createTestAccounts = async (count: number): Promise<LedgerAccount[]> => {
      const accounts: LedgerAccount[] = [];
      const currencies = ['USD', 'EUR', 'GBP'];
      const normalBalances = [NormalBalanceEnum.CREDIT, NormalBalanceEnum.DEBIT];

      for (let i = 0; i < count; i++) {
        const currency = currencies[i % currencies.length];
        const normalBalance = normalBalances[i % normalBalances.length];
        const ledgerToUse = i % 3 === 0 ? secondLedgerForPagination.id : ledger.id;

        const account = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledgerToUse,
          name: `Test Account ${i.toString().padStart(3, '0')}`,
          description: `Account for pagination test ${i}`,
          normalBalance,
          currency,
          externalId: uuidV7(),
          metadata:
            i % 5 === 0
              ? {
                  department: i % 2 === 0 ? 'finance' : 'operations',
                  region: i % 3 === 0 ? 'US' : 'EU',
                  type: 'test',
                }
              : {},
        });
        accounts.push(account);
      }
      return accounts;
    };

    beforeAll(async () => {
      // Create second ledger for pagination tests
      const ledgerService = ctx.app.get(LedgerService);
      secondLedgerForPagination = await ledgerService.createLedger({
        name: 'Pagination Test Ledger',
        description: 'Ledger for pagination testing',
        metadata: {},
      });

      // Create 25 test accounts for comprehensive pagination testing
      await createTestAccounts(25);
    });

    describe('Basic pagination', () => {
      it('should return paginated results with default limit', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data.length).toBeLessThanOrEqual(15); // Default limit
            expect(response.body.hasNext).toBeDefined();
            expect(response.body.hasPrev).toBeDefined();
            expect(response.body.nextCursor).toBeDefined();
          });
      });

      it('should respect custom limit parameter', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ limit: 5 })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeLessThanOrEqual(5);
            expect(response.body.hasNext).toBe(true);
            expect(response.body.nextCursor).toBeDefined();
          });
      });

      it('should return accounts in descending order by default', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ limit: 10 })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            const accounts = response.body.data;
            for (let i = 1; i < accounts.length; i++) {
              expect(accounts[i - 1].id > accounts[i].id).toBe(true);
            }
          });
      });
    });

    describe('Cursor-based navigation', () => {
      describe('Forward pagination', () => {
        it('should navigate to next page using nextCursor', async () => {
          // Get first page
          const firstPageResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({ limit: 5 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          expect(firstPageResponse.body.nextCursor).toBeDefined();
          expect(firstPageResponse.body.hasNext).toBe(true);

          // Get second page using nextCursor
          return request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({
              limit: 5,
              cursor: firstPageResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              expect(response.body.data.length).toBeLessThanOrEqual(5);

              // Verify no overlap with first page
              const firstPageIds = firstPageResponse.body.data.map((acc: any) => acc.id);
              const secondPageIds = response.body.data.map((acc: any) => acc.id);
              const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
              expect(overlap.length).toBe(0);
            });
        });

        it('should handle sequential forward pagination', async () => {
          let currentCursor: string | undefined;
          const allRetrievedAccounts: string[] = [];
          const pageSize = 3;
          let pageCount = 0;

          // Navigate through multiple pages
          while (pageCount < 5) {
            // Limit to prevent infinite loop
            const response = await request(ctx.app.getHttpServer())
              .get('/v1/ledger_accounts')
              .query({
                limit: pageSize,
                ...(currentCursor && { cursor: currentCursor, direction: 'next' }),
              })
              .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
              .expect(HttpStatus.OK);

            const accounts = response.body.data;
            const accountIds = accounts.map((acc: any) => acc.id);

            // Verify no duplicates across pages
            const duplicates = accountIds.filter((id: string) => allRetrievedAccounts.includes(id));
            expect(duplicates.length).toBe(0);

            allRetrievedAccounts.push(...accountIds);

            if (!response.body.hasNext) break;
            currentCursor = response.body.nextCursor;
            pageCount++;
          }

          expect(allRetrievedAccounts.length).toBeGreaterThan(pageSize * 2);
        });
      });

      describe('Backward pagination', () => {
        it('should navigate to previous page using prevCursor', async () => {
          // Get first page
          const firstPageResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({ limit: 5 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Get second page
          const secondPageResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({
              limit: 5,
              cursor: firstPageResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          expect(secondPageResponse.body.hasPrev).toBe(true);
          expect(secondPageResponse.body.prevCursor).toBeDefined();

          // Navigate back to first page
          return request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({
              limit: 5,
              cursor: secondPageResponse.body.prevCursor,
              direction: 'prev',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              // Should get back the original first page data
              const originalIds = firstPageResponse.body.data.map((acc: any) => acc.id);
              const backNavigatedIds = response.body.data.map((acc: any) => acc.id);
              expect(backNavigatedIds).toEqual(originalIds);
            });
        });
      });

      describe('Bidirectional navigation', () => {
        it('should maintain consistency when navigating forward and backward', async () => {
          // Start from middle of dataset
          const initialResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({ limit: 3 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Go forward one page
          const forwardResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({
              limit: 3,
              cursor: initialResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Go back to original position
          const backResponse = await request(ctx.app.getHttpServer())
            .get('/v1/ledger_accounts')
            .query({
              limit: 3,
              cursor: forwardResponse.body.prevCursor,
              direction: 'prev',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Should match original data
          const originalIds = initialResponse.body.data.map((acc: any) => acc.id);
          const returnedIds = backResponse.body.data.map((acc: any) => acc.id);
          expect(returnedIds).toEqual(originalIds);
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle empty result set', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ search: 'nonexistent-account-name-12345' })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data).toEqual([]);
            expect(response.body.hasNext).toBe(false);
            expect(response.body.hasPrev).toBe(false);
            expect(response.body.nextCursor).toBeUndefined();
            expect(response.body.prevCursor).toBeUndefined();
          });
      });

      it('should handle invalid cursor gracefully', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            cursor: 'invalid-cursor-id-12345',
            direction: 'next',
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            // Should return results as if no cursor was provided
            expect(Array.isArray(response.body.data)).toBe(true);
          });
      });

      it('should handle large limit values', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({ limit: 1000 })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
          });
      });

      it('should handle single page of data', async () => {
        // Filter to get very few results
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: secondLedgerForPagination.id,
            limit: 100,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.hasNext).toBe(false);
            expect(response.body.nextCursor).toBeUndefined();
          });
      });
    });

    describe('Pagination with filters', () => {
      it('should combine pagination with ledger filter', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            ledger_id: ledger.id,
            limit: 5,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((account: any) => {
              expect(account.ledgerId).toBe(ledger.id);
            });
          });
      });

      it('should combine pagination with currency filter', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            currency: 'EUR',
            limit: 5,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            response.body.data.forEach((account: any) => {
              expect(account.balances.pendingBalance.currency).toBe('EUR');
            });
          });
      });

      it('should combine pagination with search filter', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            search: 'Test Account 001',
            limit: 5,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThanOrEqual(1);
            const found = response.body.data.some((account: any) =>
              account.name.includes('Test Account 001'),
            );
            expect(found).toBe(true);
          });
      });

      it('should combine pagination with metadata filter', async () => {
        return request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            'metadata[department]': 'finance',
            limit: 5,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            // Note: metadata response structure may vary based on implementation
          });
      });

      it('should maintain pagination consistency with filters across pages', async () => {
        // Get first page with filter
        const firstPage = await request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            currency: 'USD',
            limit: 3,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK);

        if (!firstPage.body.hasNext) return; // Skip if only one page

        // Get second page with same filter
        const secondPage = await request(ctx.app.getHttpServer())
          .get('/v1/ledger_accounts')
          .query({
            currency: 'USD',
            cursor: firstPage.body.nextCursor,
            direction: 'next',
            limit: 3,
          })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK);

        // Verify all results still match the filter
        secondPage.body.data.forEach((account: any) => {
          expect(account.balances.pendingBalance.currency).toBe('USD');
        });

        // Verify no overlap
        const firstPageIds = firstPage.body.data.map((acc: any) => acc.id);
        const secondPageIds = secondPage.body.data.map((acc: any) => acc.id);
        const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
        expect(overlap.length).toBe(0);
      });
    });
  });

  describe('GET /v1/ledger_accounts/:id', () => {
    let account: LedgerAccount;
    beforeEach(async () => {
      const ledgerAccountService = ctx.app.get(LedgerAccountService);
      account = await ledgerAccountService.createLedgerAccount({
        ledgerId: ledger.id,
        name: 'credit account',
        description: 'test',
        normalBalance: NormalBalanceEnum.CREDIT,
        currency: 'USD',
        externalId: uuidV7(),
      });
    });

    it('should return 202', async () => {
      return request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${account.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(account.id);
          expect(response.body.name).toBe('credit account');
          expect(response.body.description).toBe('test');
        });
    });

    it('should retrieve using externalId', async () => {
      return request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${account.externalId}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect((response) => {
          expect(response.body.id).toBe(account.id);
          expect(response.body.name).toBe('credit account');
          expect(response.body.description).toBe('test');
          expect(response.body.externalId).toBe(account.externalId);
        });
    });
  });

  describe('PATCH /v1/ledger_accounts/:id', () => {
    let account: LedgerAccount;
    beforeEach(async () => {
      const ledgerAccountService = ctx.app.get(LedgerAccountService);
      account = await ledgerAccountService.createLedgerAccount({
        ledgerId: ledger.id,
        name: 'credit account',
        description: 'test',
        normalBalance: NormalBalanceEnum.CREDIT,
        currency: 'USD',
        externalId: uuidV7(),
        metadata: {
          test: 'value',
        },
      });
    });
    it('should return 200', async () => {
      const beforeUpdate = await ctx.trx
        .selectFrom('ledgerAccounts')
        .where('id', '=', account.id)
        .selectAll()
        .executeTakeFirst();
      expect(beforeUpdate!.name).toBe('credit account');

      await request(ctx.app.getHttpServer())
        .patch(`/v1/ledger_accounts/${account.id}`)
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
          expect(response.body.id).toBe(account.id);
          expect(response.body.name).toBe('test');
          expect(response.body.description).toBe('description');
          expect(response.body.metadata.test).toBe('transfa');
        });

      const afterUpdate = await ctx.trx
        .selectFrom('ledgerAccounts')
        .where('id', '=', account.id)
        .selectAll()
        .executeTakeFirstOrThrow();

      expect(afterUpdate.name).toBe('test');
      expect(afterUpdate.description).toBe('description');
    });

    it('should update description & metadata', async () => {
      const beforeUpdate = await ctx.trx
        .selectFrom('ledgerAccounts')
        .where('id', '=', account.id)
        .selectAll()
        .executeTakeFirstOrThrow();
      const previousDescription = beforeUpdate.description;
      const description = 'Transfa Ledger';
      const metadata = { test: 'value' };

      await request(ctx.app.getHttpServer())
        .patch(`/v1/ledger_accounts/${account.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description, metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.description).toBe(description);
          expect(response.body.metadata).toMatchObject(metadata);
        });

      const ledgerAfterUpdate = await ctx.trx
        .selectFrom('ledgerAccounts')
        .where('id', '=', account.id)
        .selectAll()
        .executeTakeFirst();
      expect(ledgerAfterUpdate!.description).not.toBe(previousDescription);
      expect(ledgerAfterUpdate!.description).toBe(description);

      expect(
        await ctx.trx
          .selectFrom('ledgerAccountMetadata')
          .where('ledgerAccountId', '=', account.id)
          .where('key', '=', 'test')
          .where('value', '=', 'value')
          .selectAll()
          .executeTakeFirstOrThrow(),
      ).toBeDefined();
    });

    it('should remove metadata', async () => {
      const metadata = { test: null };
      expect(
        await ctx.trx
          .selectFrom('ledgerAccountMetadata')
          .where('ledgerAccountId', '=', account.id)
          .where('key', '=', 'test')
          .selectAll()
          .executeTakeFirstOrThrow(),
      ).not.toBeNull();

      await request(ctx.app.getHttpServer())
        .patch(`/v1/ledger_accounts/${account.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ metadata })
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.metadata.test).toBeUndefined();
        });

      expect(
        await ctx.trx
          .selectFrom('ledgerAccountMetadata')
          .where('ledgerAccountId', '=', account.id)
          .where('key', '=', 'test')
          .selectAll()
          .executeTakeFirst(),
      ).not.toBeDefined();
    });
  });
});
