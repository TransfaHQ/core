import BigNumber from 'bignumber.js';
import request from 'supertest';

import { HttpStatus } from '@nestjs/common';

import { setupTestContext } from '@src/test/helpers';

import { bufferToTbId } from '@libs/database/utils';
import { LedgerTransactionStatusEnum, NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
import { UpdateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/update-ledger-account.dto';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';
import { Ledger, LedgerAccount } from '@modules/ledger/types';

describe('LedgerTransactionController', () => {
  const ctx = setupTestContext();
  let tigerBeetleService: TigerBeetleService;
  let authKey: KeyResponseDto;
  let ledger: Ledger;
  let ledger2: Ledger;
  let eurCreditAccount: LedgerAccount;
  let eurDebitAccount: LedgerAccount;
  let usdCreditAccount: LedgerAccount;
  let usdDebitAccount: LedgerAccount;
  let ledgerAccountService: LedgerAccountService;
  let usdDebitAccount2: LedgerAccount;

  beforeAll(async () => {
    const authService = ctx.app.get(AuthService);
    authKey = await authService.createKey({});
    ledgerAccountService = ctx.app.get(LedgerAccountService);
    const ledgerService = ctx.app.get(LedgerService);
    const usdCurrency = await ctx.app.get(CurrencyService).findByCode('USD');
    const eurCurrency = await ctx.app.get(CurrencyService).findByCode('EUR');

    // We need to create account
    ledger = await ledgerService.createLedger({
      name: 'test 1',
      description: 'test 2',
      metadata: {},
    });

    ledger2 = await ledgerService.createLedger({
      name: 'test 2',
      description: 'test',
      metadata: {},
    });

    eurCreditAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'eur credit',
      description: '',
      currency: eurCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
      minBalanceLimit: null,
      maxBalanceLimit: null,
    });

    eurDebitAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'eur debit',
      description: '',
      currency: eurCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      minBalanceLimit: null,
      maxBalanceLimit: null,
    });

    usdDebitAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'usd debit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      minBalanceLimit: null,
      maxBalanceLimit: null,
    });

    usdCreditAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'usd credit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
      minBalanceLimit: null,
      maxBalanceLimit: null,
    });

    usdDebitAccount2 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'usd debit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      minBalanceLimit: null,
      maxBalanceLimit: null,
    });

    tigerBeetleService = ctx.app.get(TigerBeetleService);
  });

  describe('POST /v1/ledger_transactions', () => {
    const endpoint = '/v1/ledger_transactions';

    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .post(endpoint)
        .send({})
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 when ledger name is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ description: 'test' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not accept invalid data', async () => {
      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 1 })
        .expect(HttpStatus.BAD_REQUEST);

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'na' })
        .expect(HttpStatus.BAD_REQUEST);

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'nan', description: '1' })
        .expect(HttpStatus.BAD_REQUEST);

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send({ name: 'nan', description: '123', metadata: { test: 1 } })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not transact in two different currencies', async () => {
      const data = {
        description: 'test',
        externalId: uuidV7(),
        metadata: { test: 'test' },
        ledgerEntries: [
          {
            sourceAccountId: usdDebitAccount2.id,
            destinationAccountId: eurCreditAccount.id,
            amount: 10,
          },
        ],
      };

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((response) => {
          expect(response.body.message[0]).toBe(
            'sourceAccountId & destinationAccountId should have the same currency code',
          );
        });
    });

    it('should not transact in two different ledgers within same entry', async () => {
      const data = {
        description: 'test',
        externalId: uuidV7(),
        metadata: { test: 'test' },
        ledgerEntries: [
          {
            sourceAccountId: usdDebitAccount.id,
            destinationAccountId: eurCreditAccount.id,
            amount: 10,
          },
        ],
      };

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((response) => {
          expect(response.body.message[0]).toBe(
            'sourceAccountId & destinationAccountId should belong to the same ledger',
          );
        });
    });

    it('should not transact using the same account as source & destination for the same entry', async () => {
      const data = {
        description: 'test',
        externalId: uuidV7(),
        metadata: { test: 'test' },
        ledgerEntries: [
          {
            sourceAccountId: usdDebitAccount.id,
            destinationAccountId: usdDebitAccount.id,
            amount: 10,
          },
        ],
      };

      await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data)
        .expect(HttpStatus.BAD_REQUEST)
        .expect((response) => {
          expect(response.body.message[0]).toBe(
            'sourceAccountId & destinationAccountId should not be the same',
          );
        });
    });

    describe('record transaction', () => {
      it('should record transactions between same account on the same ledger', async () => {
        const data = {
          description: 'test',
          externalId: uuidV7(),
          metadata: { test: 'test' },
          effectiveAt: '2025-01-10',
          ledgerEntries: [
            {
              sourceAccountId: eurDebitAccount.id,
              destinationAccountId: eurCreditAccount.id,
              amount: 10,
            },
            {
              sourceAccountId: usdDebitAccount.id,
              destinationAccountId: usdCreditAccount.id,
              amount: 10,
            },
          ],
        };

        let entries: any[] = [];
        let transactionId: string = '';

        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .send(data)
          .expect(HttpStatus.CREATED)
          .expect(async (response) => {
            transactionId = response.body.id;

            expect(response.body.ledgerEntries.length).toBe(4);
            expect(response.body.externalId).toBe(data.externalId);
            expect(response.body.description).toBe(data.description);
            expect(response.body.id).toBeDefined();
            expect(response.body.effectiveAt).toBe('2025-01-10T00:00:00.000Z');
            expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
            entries = response.body.ledgerEntries;
          });

        await Promise.all(
          entries.map(async (entry) => {
            expect(entry.amount).toBe(10);

            const tbAmount = 10 * 1e2;
            if (entry.ledgerAccountId === eurDebitAccount.id) {
              expect(entry.direction).toBe(NormalBalanceEnum.DEBIT);
              expect(entry.ledgerAccountCurrency).toBe(eurDebitAccount.currencyCode);
              expect(entry.ledgerAccountCurrencyExponent).toBe(eurDebitAccount.currencyExponent);
            }

            if (entry.ledgerAccountId === eurCreditAccount.id) {
              expect(entry.direction).toBe(NormalBalanceEnum.CREDIT);
              expect(entry.ledgerAccountCurrency).toBe(eurCreditAccount.currencyCode);
              expect(entry.ledgerAccountCurrencyExponent).toBe(eurCreditAccount.currencyExponent);
            }

            if (entry.ledgerAccountId === usdCreditAccount.id) {
              expect(entry.direction).toBe(NormalBalanceEnum.CREDIT);
              expect(entry.ledgerAccountCurrency).toBe(usdCreditAccount.currencyCode);
              expect(entry.ledgerAccountCurrencyExponent).toBe(usdCreditAccount.currencyExponent);
            }

            if (entry.ledgerAccountId === usdDebitAccount.id) {
              expect(entry.direction).toBe(NormalBalanceEnum.DEBIT);
              expect(entry.ledgerAccountCurrency).toBe(usdDebitAccount.currencyCode);
              expect(entry.ledgerAccountCurrencyExponent).toBe(usdDebitAccount.currencyExponent);
            }

            const ledgerAccount = await ctx.trx
              .selectFrom('ledgerAccounts')
              .selectAll()
              .where('id', '=', entry.ledgerAccountId)
              .executeTakeFirstOrThrow();

            const ledgerEntry = await ctx.trx
              .selectFrom('ledgerEntries')
              .selectAll()
              .where('id', '=', entry.id)
              .executeTakeFirstOrThrow();

            const ledger = await ctx.trx
              .selectFrom('ledgers')
              .selectAll()
              .where('id', '=', ledgerAccount.ledgerId)
              .executeTakeFirstOrThrow();

            const tbTransfer = await tigerBeetleService.retrieveTransfer(ledgerEntry.tigerBeetleId);
            const tbAccount = await tigerBeetleService.retrieveAccount(ledgerAccount.tigerBeetleId);

            expect(tbTransfer.amount).toBe(BigInt(tbAmount));
            expect(tbTransfer.id).toBe(bufferToTbId(ledgerEntry.tigerBeetleId));
            expect(ledgerEntry.ledgerTransactionId).toBe(transactionId);
            if (entry.direction === NormalBalanceEnum.CREDIT) {
              expect(tbTransfer.credit_account_id).toBe(bufferToTbId(ledgerAccount.tigerBeetleId));
              expect(tbAccount.credits_posted).toBe(BigInt(tbAmount));
            } else {
              expect(tbTransfer.debit_account_id).toBe(bufferToTbId(ledgerAccount.tigerBeetleId));
              expect(tbAccount.debits_posted).toBe(BigInt(tbAmount));
            }

            expect(tbTransfer.code).toBe(1);
            expect(tbTransfer.ledger).toBe(ledger.tigerBeetleId);
          }),
        );
      });

      it('should send from credit to debit account', async () => {
        const data = {
          description: 'test',
          externalId: uuidV7(),
          metadata: { test: 'test' },
          ledgerEntries: [
            {
              sourceAccountId: eurCreditAccount.id,
              destinationAccountId: eurDebitAccount.id,
              amount: 10,
            },
          ],
        };

        let transactionId: string = '';
        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .send(data)
          .expect(HttpStatus.CREATED)
          .expect(async (response) => {
            transactionId = response.body.id;
            expect(response.body.ledgerEntries.length).toBe(2);
            expect(response.body.externalId).toBe(data.externalId);
            expect(response.body.description).toBe(data.description);
            expect(response.body.id).toBeDefined();
            expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
          });

        const sourceTbAccount = await tigerBeetleService.retrieveAccount(
          eurCreditAccount.tigerBeetleId,
        );
        const destinationTbAccount = await tigerBeetleService.retrieveAccount(
          eurDebitAccount.tigerBeetleId,
        );
        expect(sourceTbAccount.debits_posted).toBe(1000n);
        expect(destinationTbAccount.credits_posted).toBe(1000n);
        const count = await ctx.trx
          .selectFrom('ledgerTransactionMetadata')
          .select(({ fn }) => [fn.countAll().as('count')])
          .where('ledgerTransactionId', '=', transactionId)
          .where('key', '=', 'test')
          .executeTakeFirst();
        expect(BigNumber(count!.count).toNumber()).toBe(1);
      });

      it('should make request idempotent', async () => {
        const data = {
          description: 'test',
          externalId: uuidV7(),
          metadata: { test: 'test' },
          effectiveAt: '2025-10-08T20:53:21.239Z',
          ledgerEntries: [
            {
              destinationAccountId: eurCreditAccount.id,
              sourceAccountId: eurDebitAccount.id,
              amount: 10,
            },
          ],
        };

        const idempotencyKey = uuidV7();

        let transactionId1: string = '';
        let response1: Record<string, any> = {};

        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
          .send(data)
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            response1 = response.body;
            transactionId1 = response.body.id;
            expect(response.body.ledgerEntries.length).toBe(2);
            expect(response.body.externalId).toBe(data.externalId);
            expect(response.body.description).toBe(data.description);
            expect(response.body.id).toBeDefined();
            expect(response.headers['x-idempotency-replayed']).toBe('false');
            expect(response.body.effectiveAt).toBe(data.effectiveAt);
            expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
          });

        const sourceTbAccount = await tigerBeetleService.retrieveAccount(
          eurCreditAccount.tigerBeetleId,
        );
        const destinationTbAccount = await tigerBeetleService.retrieveAccount(
          eurDebitAccount.tigerBeetleId,
        );

        expect(sourceTbAccount.debits_posted).toBe(1000n);
        expect(destinationTbAccount.credits_posted).toBe(1000n);
        const count = await ctx.trx
          .selectFrom('ledgerTransactionMetadata')
          .select(({ fn }) => [fn.countAll().as('count')])
          .where('ledgerTransactionId', '=', transactionId1)
          .where('key', '=', 'test')
          .executeTakeFirst();
        expect(BigNumber(count!.count).toNumber()).toBe(1);

        let transactionId2 = '';
        let response2: Record<string, any> = {};

        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
          .send(data)
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            expect(response.headers['x-idempotency-replayed']).toBe('true');
            response2 = response.body;
            transactionId2 = response.body.id;
            expect(response.body.ledgerEntries.length).toBe(2);
            expect(response.body.externalId).toBe(data.externalId);
            expect(response.body.description).toBe(data.description);
            expect(response.body.id).toBeDefined();
            expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
          });

        expect(transactionId1).toBe(transactionId2);
        expect(response1.ledgerEntries[0].id).toBe(response2.ledgerEntries[0].id);
        expect(response1.ledgerEntries[0].amount).toBe(response2.ledgerEntries[0].amount);
        expect(response1.ledgerEntries[0].type).toBe(response2.ledgerEntries[0].type);

        expect(response1.ledgerEntries[1].id).toBe(response2.ledgerEntries[1].id);
        expect(response1.ledgerEntries[1].amount).toBe(response2.ledgerEntries[1].amount);
        expect(response1.ledgerEntries[1].type).toBe(response2.ledgerEntries[1].type);

        expect(
          await ctx.trx
            .selectFrom('idempotencyKeys')
            .selectAll()
            .where('externalId', '=', idempotencyKey)
            .executeTakeFirst(),
        ).toBeDefined();
      });

      describe('Idempotency key validation', () => {
        it('should return 409 when same idempotency key is used with different amount', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'test',
            externalId: uuidV7(),
            metadata: { test: 'test' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED);

          // Second request with different amount should fail with 409
          data.ledgerEntries[0].amount = 20;
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CONFLICT)
            .expect((response) => {
              expect(response.body.message).toBe(
                'Idempotency key already used with different request body',
              );
            });
        });

        it('should return 409 when same idempotency key is used with different ledger entries', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'test',
            externalId: uuidV7(),
            metadata: { test: 'test' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED);

          // Second request with different accounts should fail with 409
          data.ledgerEntries[0].sourceAccountId = usdDebitAccount.id;
          data.ledgerEntries[0].destinationAccountId = usdCreditAccount.id;
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CONFLICT)
            .expect((response) => {
              expect(response.body.message).toBe(
                'Idempotency key already used with different request body',
              );
            });
        });

        it('should return 409 when same idempotency key is used with different metadata', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'test',
            externalId: uuidV7(),
            metadata: { test: 'original' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED);

          // Second request with different metadata should fail with 409
          data.metadata.test = 'modified';
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CONFLICT)
            .expect((response) => {
              expect(response.body.message).toBe(
                'Idempotency key already used with different request body',
              );
            });
        });

        it('should return 409 when same idempotency key is used with different description', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'original description',
            externalId: uuidV7(),
            metadata: { test: 'test' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED);

          // Second request with different description should fail with 409
          data.description = 'modified description';
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CONFLICT)
            .expect((response) => {
              expect(response.body.message).toBe(
                'Idempotency key already used with different request body',
              );
            });
        });

        it('should return 409 when same idempotency key is used with different effectiveAt', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'test',
            externalId: uuidV7(),
            metadata: { test: 'test' },
            effectiveAt: '2025-01-10',
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED);

          // Second request with different effectiveAt should fail with 409
          data.effectiveAt = '2025-01-15';
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CONFLICT)
            .expect((response) => {
              expect(response.body.message).toBe(
                'Idempotency key already used with different request body',
              );
            });
        });

        it('should successfully replay when same key used with identical body', async () => {
          const idempotencyKey = uuidV7();
          const data = {
            description: 'test',
            externalId: uuidV7(),
            metadata: { test: 'test', another: 'value' },
            effectiveAt: '2025-01-10',
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          let firstResponse: any;

          // First request should succeed
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED)
            .expect((response) => {
              firstResponse = response.body;
              expect(response.headers['x-idempotency-replayed']).toBe('false');
            });

          // Second request with exact same data should replay successfully
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
            .send(data)
            .expect(HttpStatus.CREATED)
            .expect((response) => {
              expect(response.headers['x-idempotency-replayed']).toBe('true');
              expect(response.body.id).toBe(firstResponse.id);
              expect(response.body.externalId).toBe(firstResponse.externalId);
            });
        });

        it('should allow different idempotency keys with different request bodies', async () => {
          const idempotencyKey1 = uuidV7();
          const idempotencyKey2 = uuidV7();
          const data1 = {
            description: 'test 1',
            externalId: uuidV7(),
            metadata: { test: 'test1' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 10,
              },
            ],
          };

          const data2 = {
            description: 'test 2',
            externalId: uuidV7(),
            metadata: { test: 'test2' },
            ledgerEntries: [
              {
                sourceAccountId: eurDebitAccount.id,
                destinationAccountId: eurCreditAccount.id,
                amount: 20,
              },
            ],
          };

          // Both requests should succeed with different idempotency keys
          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey1))
            .send(data1)
            .expect(HttpStatus.CREATED);

          await request(ctx.app.getHttpServer())
            .post(endpoint)
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey2))
            .send(data2)
            .expect(HttpStatus.CREATED);
        });
      });

      it('should create a transaction with pending status', async () => {
        // fetch account and its balances
        const eurDebitAccountResponse = await request(ctx.app.getHttpServer())
          .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

        const eurCreditAccountResponse = await request(ctx.app.getHttpServer())
          .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

        const data = {
          description: 'test',
          externalId: uuidV7(),
          metadata: { test: 'test' },
          effectiveAt: '2025-01-10',
          status: LedgerTransactionStatusEnum.PENDING,
          ledgerEntries: [
            {
              sourceAccountId: eurDebitAccount.id,
              destinationAccountId: eurCreditAccount.id,
              amount: 10,
            },
            {
              sourceAccountId: usdDebitAccount.id,
              destinationAccountId: usdCreditAccount.id,
              amount: 10,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .send(data)
          .expect(HttpStatus.CREATED)
          .expect(async (response) => {
            expect(response.body.status).toBe(LedgerTransactionStatusEnum.PENDING);
          });

        // Fetch account and make sure that it is working as expected
        // fetch account and its balances
        const eurDebitAccountResponse2 = await request(ctx.app.getHttpServer())
          .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

        const eurCreditAccountResponse2 = await request(ctx.app.getHttpServer())
          .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

        expect(eurCreditAccountResponse.body.balances.pendingBalance.amount).toBe(0);
        expect(eurCreditAccountResponse.body.balances.pendingBalance.credits).toBe(0);
        expect(eurCreditAccountResponse.body.balances.pendingBalance.debits).toBe(0);

        expect(eurCreditAccountResponse2.body.balances.pendingBalance.amount).toBe(
          data.ledgerEntries[0].amount,
        );
        expect(eurCreditAccountResponse2.body.balances.pendingBalance.credits).toBe(
          data.ledgerEntries[0].amount,
        );
        expect(eurCreditAccountResponse2.body.balances.pendingBalance.debits).toBe(0);

        // Sender account
        expect(eurDebitAccountResponse.body.balances.pendingBalance.amount).toBe(0);
        expect(eurDebitAccountResponse.body.balances.pendingBalance.credits).toBe(0);
        expect(eurDebitAccountResponse.body.balances.pendingBalance.debits).toBe(0);

        expect(eurDebitAccountResponse2.body.balances.pendingBalance.amount).toBe(
          data.ledgerEntries[0].amount,
        );
        expect(eurDebitAccountResponse2.body.balances.pendingBalance.debits).toBe(
          data.ledgerEntries[0].amount,
        );
        expect(eurDebitAccountResponse2.body.balances.pendingBalance.credits).toBe(0);
      });

      it('should not allow creating transactions with archived status', async () => {
        const data = {
          description: 'test',
          externalId: uuidV7(),
          metadata: { test: 'test' },
          effectiveAt: '2025-01-10',
          status: LedgerTransactionStatusEnum.ARCHIVED,
          ledgerEntries: [
            {
              sourceAccountId: eurDebitAccount.id,
              destinationAccountId: eurCreditAccount.id,
              amount: 10,
            },
            {
              sourceAccountId: usdDebitAccount.id,
              destinationAccountId: usdCreditAccount.id,
              amount: 10,
            },
          ],
        };
        await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .send(data)
          .expect(HttpStatus.BAD_REQUEST)
          .expect(async (response) => {
            expect(response.body.message[0]).toBe(
              'status must be one of the following values: pending, posted',
            );
          });
      });
    });
  });

  describe('GET /v1/ledger_transactions/:id', () => {
    const endpoint = '/v1/ledger_transactions';
    let transactionId: string;
    let externalId: string;

    beforeEach(async () => {
      externalId = uuidV7();
      const data = {
        description: 'test retrieve transaction',
        externalId,
        metadata: { test: 'retrieve' },
        ledgerEntries: [
          {
            sourceAccountId: eurDebitAccount.id,
            destinationAccountId: eurCreditAccount.id,
            amount: 50,
          },
        ],
      };

      const response = await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data);

      transactionId = response.body.id;
    });

    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .get(`${endpoint}/${transactionId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should retrieve a transaction by id', async () => {
      await request(ctx.app.getHttpServer())
        .get(`${endpoint}/${transactionId}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.description).toBe('test retrieve transaction');
          expect(response.body.metadata.test).toBe('retrieve');
          expect(response.body.ledgerEntries.length).toBe(2);
        });
    });

    it('should retrieve a transaction by externalId', async () => {
      await request(ctx.app.getHttpServer())
        .get(`${endpoint}/${externalId}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.description).toBe('test retrieve transaction');
        });
    });

    it('should return 404 when transaction not found', async () => {
      const nonExistentId = uuidV7();
      await request(ctx.app.getHttpServer())
        .get(`${endpoint}/${nonExistentId}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /v1/ledger_transactions', () => {
    const endpoint = '/v1/ledger_transactions';
    const createdTransactions: Array<{ id: string; externalId: string; description: string }> = [];

    beforeAll(async () => {
      for (let i = 0; i < 5; i++) {
        const data = {
          description: `test list transaction ${i}`,
          externalId: uuidV7(),
          metadata: { index: `${i}`, category: 'test' },
          ledgerEntries: [
            {
              sourceAccountId: eurDebitAccount.id,
              destinationAccountId: eurCreditAccount.id,
              amount: 10 + i,
            },
          ],
        };

        const response = await request(ctx.app.getHttpServer())
          .post(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .send(data);

        createdTransactions.push({
          id: response.body.id,
          externalId: data.externalId,
          description: data.description,
        });
      }
    });

    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer()).get(endpoint).expect(HttpStatus.UNAUTHORIZED);
    });

    it('should list transactions with default pagination', async () => {
      await request(ctx.app.getHttpServer())
        .get(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(Array.isArray(response.body.data)).toBe(true);
          expect(response.body.data.length).toBeGreaterThan(0);
          expect(response.body.hasNext).toBeDefined();
          expect(response.body.hasPrev).toBeDefined();

          const transaction = response.body.data[0];
          expect(transaction.id).toBeDefined();
          expect(transaction.externalId).toBeDefined();
          expect(transaction.description).toBeDefined();
          expect(transaction.metadata).toBeDefined();
          expect(transaction.effectiveAt).toBeDefined();
          expect(Array.isArray(transaction.ledgerEntries)).toBe(true);
        });
    });

    it('should list transactions with custom limit', async () => {
      await request(ctx.app.getHttpServer())
        .get(endpoint)
        .query({ limit: 2 })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.data.length).toBeLessThanOrEqual(2);
        });
    });

    it('should filter transactions by externalId', async () => {
      const targetTransaction = createdTransactions[0];
      await request(ctx.app.getHttpServer())
        .get(endpoint)
        .query({ externalId: targetTransaction.externalId })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.data.length).toBe(1);
          expect(response.body.data[0].externalId).toBe(targetTransaction.externalId);
        });
    });

    it('should filter transactions by search (description)', async () => {
      await request(ctx.app.getHttpServer())
        .get(endpoint)
        .query({ search: 'test list transaction 2' })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.data.length).toBeGreaterThan(0);
          expect(response.body.data[0].description).toContain('test list transaction 2');
        });
    });

    it('should filter transactions by metadata', async () => {
      await request(ctx.app.getHttpServer())
        .get(endpoint)
        .query({ 'metadata[category]': 'test' })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.body.data.length).toBeGreaterThanOrEqual(5);
          response.body.data.forEach((txn: any) => {
            expect(txn.metadata.category).toBe('test');
          });
        });
    });

    it('should paginate transactions using cursor', async () => {
      const firstPage = await request(ctx.app.getHttpServer())
        .get(endpoint)
        .query({ limit: 2 })
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.OK);

      expect(firstPage.body.data.length).toBeLessThanOrEqual(2);
      const nextCursor = firstPage.body.nextCursor;

      if (nextCursor) {
        await request(ctx.app.getHttpServer())
          .get(endpoint)
          .query({ limit: 2, afterCursor: nextCursor })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect(async (response) => {
            expect(response.body.data.length).toBeGreaterThan(0);
            // Ensure different data from first page
            expect(response.body.data[0].id).not.toBe(firstPage.body.data[0].id);
          });
      }
    });
  });

  describe('POST /v1/ledger_transactions/:id/post', () => {
    const endpoint = '/v1/ledger_transactions';
    let transactionId: string;
    let externalId: string;

    beforeEach(async () => {
      externalId = uuidV7();
      const data = {
        description: 'test retrieve transaction',
        externalId,
        metadata: { test: 'retrieve' },
        status: 'pending',
        ledgerEntries: [
          {
            sourceAccountId: eurDebitAccount.id,
            destinationAccountId: eurCreditAccount.id,
            amount: 50,
          },
        ],
      };

      const response = await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data);

      transactionId = response.body.id;
    });

    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/post`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should post transaction', async () => {
      const idempotencyKey = uuidV7();
      // fetch account and its balances
      const eurDebitAccountResponse = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      const eurCreditAccountResponse = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/post`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.headers['x-idempotency-replayed']).toBe('false');

          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
        });

      // fetch account and its balances
      const eurDebitAccountResponse2 = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      const eurCreditAccountResponse2 = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      expect(eurCreditAccountResponse2.body.balances.availableBalance.amount).toBe(
        eurCreditAccountResponse.body.balances.availableBalance.amount + 50,
      );

      expect(eurDebitAccountResponse2.body.balances.availableBalance.amount).toBe(
        eurDebitAccountResponse.body.balances.availableBalance.amount + 50,
      );

      // reply won't work
      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/post`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.headers['x-idempotency-replayed']).toBe('true');
          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.status).toBe(LedgerTransactionStatusEnum.POSTED);
        });
    });

    it('should return 404 when transaction not found', async () => {
      const nonExistentId = uuidV7();
      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${nonExistentId}/post`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /v1/ledger_transactions/:id/archive', () => {
    const endpoint = '/v1/ledger_transactions';
    let transactionId: string;
    let externalId: string;

    beforeEach(async () => {
      externalId = uuidV7();
      const data = {
        description: 'test retrieve transaction',
        externalId,
        metadata: { test: 'retrieve' },
        status: 'pending',
        ledgerEntries: [
          {
            sourceAccountId: eurDebitAccount.id,
            destinationAccountId: eurCreditAccount.id,
            amount: 50,
          },
        ],
      };

      const response = await request(ctx.app.getHttpServer())
        .post(endpoint)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .send(data);

      transactionId = response.body.id;
    });

    it('should return 401 when auth is not provided', async () => {
      return request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/archive`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should archive transaction', async () => {
      const idempotencyKey = uuidV7();
      // fetch account and its balances
      const eurDebitAccountResponse = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      const eurCreditAccountResponse = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/archive`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.headers['x-idempotency-replayed']).toBe('false');

          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.status).toBe(LedgerTransactionStatusEnum.ARCHIVED);
        });

      // fetch account and its balances
      const eurDebitAccountResponse2 = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurDebitAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      const eurCreditAccountResponse2 = await request(ctx.app.getHttpServer())
        .get(`/v1/ledger_accounts/${eurCreditAccount.id}`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret));

      expect(eurCreditAccountResponse2.body.balances.availableBalance.amount).toBe(
        eurCreditAccountResponse.body.balances.availableBalance.amount,
      );

      expect(eurDebitAccountResponse2.body.balances.availableBalance.amount).toBe(
        eurDebitAccountResponse.body.balances.availableBalance.amount,
      );

      // reply won't work
      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${transactionId}/archive`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret, idempotencyKey))
        .expect(HttpStatus.OK)
        .expect(async (response) => {
          expect(response.headers['x-idempotency-replayed']).toBe('true');
          expect(response.body.id).toBe(transactionId);
          expect(response.body.externalId).toBe(externalId);
          expect(response.body.status).toBe(LedgerTransactionStatusEnum.ARCHIVED);
        });
    });

    it('should return 404 when transaction not found', async () => {
      const nonExistentId = uuidV7();
      await request(ctx.app.getHttpServer())
        .post(`${endpoint}/${nonExistentId}/archive`)
        .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
        .expect(HttpStatus.NOT_FOUND);
    });

    describe('Max Balance Limit', () => {
      let debitAccount: LedgerAccount;
      let creditAccount: LedgerAccount;
      let debitAccount2: LedgerAccount;

      beforeEach(async () => {
        debitAccount = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd debit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.DEBIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        await ledgerAccountService.update(debitAccount.id, {
          maxBalanceLimit: 100,
        } as UpdateLedgerAccountDto);

        creditAccount = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd credit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        await ledgerAccountService.update(creditAccount.id, {
          maxBalanceLimit: 100,
        } as UpdateLedgerAccountDto);

        debitAccount2 = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd debit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.DEBIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });
      });

      it('should not accept more than max balance limit on credit account', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount2.id,
              destinationAccountId: creditAccount.id,
              amount: 50,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);

        data.ledgerEntries[0].amount = 500;
        data.externalId = uuidV7();
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should not accept more than max balance limit on debit account', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 50,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);

        data.ledgerEntries[0].amount = 500;
        data.externalId = uuidV7();
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should not validate max balance limit when creating pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 500,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);
      });

      it('should not validate max balance limit when archiving pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 500,
            },
          ],
        };
        let transactionId = '';
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            transactionId = response.body.id;
          });

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}/${transactionId}/archive`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK);
      });

      it('should validate max balance limit when posting pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 500,
            },
          ],
        };
        let transactionId = '';
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            transactionId = response.body.id;
          });

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}/${transactionId}/post`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });
    });

    describe('Min Balance Limit', () => {
      let debitAccount: LedgerAccount;
      let creditAccount: LedgerAccount;
      let creditAccount2: LedgerAccount;
      let debitAccount2: LedgerAccount;

      beforeEach(async () => {
        debitAccount = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd debit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.DEBIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        await ledgerAccountService.update(debitAccount.id, {
          minBalanceLimit: 15,
        } as UpdateLedgerAccountDto);

        creditAccount = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd credit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        await ledgerAccountService.update(creditAccount.id, {
          minBalanceLimit: 5,
        } as UpdateLedgerAccountDto);

        debitAccount2 = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd debit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.DEBIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        creditAccount2 = await ledgerAccountService.createLedgerAccount({
          ledgerId: ledger.id,
          name: 'usd credit',
          description: '',
          currency: 'USD',
          normalBalance: NormalBalanceEnum.CREDIT,
          minBalanceLimit: null,
          maxBalanceLimit: null,
        });

        const data = {
          description: 'test retrieve transaction',
          externalId: uuidV7(),
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 50,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);
      });

      it('should not allow balance to lower than min balance limit on credit account', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: creditAccount.id,
              destinationAccountId: creditAccount2.id,
              amount: 40,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);

        data.ledgerEntries[0].amount = 6;
        data.externalId = uuidV7();
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should not allow balance to lower than min balance limit on debit account', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount2.id,
              destinationAccountId: debitAccount.id,
              amount: 30,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);

        data.ledgerEntries[0].amount = 10;
        data.externalId = uuidV7();
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should not validate min balance limit when creating pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount2.id,
              destinationAccountId: debitAccount.id,
              amount: 5,
            },
          ],
        };

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);
      });

      it('should not validate min balance limit when archiving pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: creditAccount.id,
              destinationAccountId: creditAccount2.id,
              amount: 5,
            },
          ],
        };
        let transactionId = '';
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            transactionId = response.body.id;
          });

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}/${transactionId}/archive`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK);
      });

      it('should validate min balance limit when posting pending transaction', async () => {
        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'pending',
          ledgerEntries: [
            {
              sourceAccountId: creditAccount.id,
              destinationAccountId: creditAccount2.id,
              amount: 50,
            },
          ],
        };
        let transactionId = '';
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED)
          .expect((response) => {
            transactionId = response.body.id;
          });

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}/${transactionId}/post`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });

      it('should validate min & max balance when set', async () => {
        await ledgerAccountService.update(debitAccount.id, {
          minBalanceLimit: 15,
          maxBalanceLimit: 75,
        } as UpdateLedgerAccountDto);

        await ledgerAccountService.update(creditAccount.id, {
          minBalanceLimit: 5,
          maxBalanceLimit: 75,
        } as UpdateLedgerAccountDto);

        externalId = uuidV7();
        const data = {
          description: 'test retrieve transaction',
          externalId,
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: debitAccount.id,
              destinationAccountId: creditAccount.id,
              amount: 75,
            },
          ],
        };

        // Max balance will be exceeded on debit account so it should refuse
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);

        // Max balance will be exceeded on debit account so it should refuse
        data.externalId = uuidV7();
        data.ledgerEntries[0].amount = 10;

        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.CREATED);

        // Min balance on credit account be exceeded on credit account so it should refuse
        const data2 = {
          description: 'test retrieve transaction',
          externalId: uuidV7(),
          metadata: { test: 'retrieve' },
          status: 'posted',
          ledgerEntries: [
            {
              sourceAccountId: creditAccount.id,
              destinationAccountId: debitAccount.id,
              amount: 66,
            },
          ],
        };
        await request(ctx.app.getHttpServer())
          .post(`${endpoint}`)
          .send(data2)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.BAD_REQUEST);
      });
    });
  });
});
