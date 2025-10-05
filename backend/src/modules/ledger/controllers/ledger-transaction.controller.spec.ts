import BigNumber from 'bignumber.js';
import request from 'supertest';

import { HttpStatus } from '@nestjs/common';

import { setupTestContext } from '@src/test/helpers';

import { bufferToTbId } from '@libs/database/utils';
import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
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
    });

    eurDebitAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'eur debit',
      description: '',
      currency: eurCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
    });

    usdDebitAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'usd debit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
    });

    usdCreditAccount = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'usd credit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
    });

    usdDebitAccount2 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger.id,
      name: 'usd debit',
      description: '',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
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
            entries = response.body.ledgerEntries;
          });

        await Promise.all(
          entries.map(async (entry) => {
            const amount = 10 * 1e2;
            expect(entry.amount).toBe(amount);
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

            expect(tbTransfer.amount).toBe(BigInt(amount));
            expect(tbTransfer.id).toBe(bufferToTbId(ledgerEntry.tigerBeetleId));
            expect(ledgerEntry.ledgerTransactionId).toBe(transactionId);
            if (entry.direction === NormalBalanceEnum.CREDIT) {
              expect(tbTransfer.credit_account_id).toBe(bufferToTbId(ledgerAccount.tigerBeetleId));
              expect(tbAccount.credits_posted).toBe(BigInt(amount));
            } else {
              expect(tbTransfer.debit_account_id).toBe(bufferToTbId(ledgerAccount.tigerBeetleId));
              expect(tbAccount.debits_posted).toBe(BigInt(amount));
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
    });
  });
});
