import request from 'supertest';

import { HttpStatus } from '@nestjs/common';

import { setupTestContext } from '@src/test/helpers';

import { LedgerTransactionStatusEnum, NormalBalanceEnum } from '@libs/enums';
import { setTestBasicAuthHeader } from '@libs/utils/tests';
import { uuidV7 } from '@libs/utils/uuid';

import { AuthService } from '@modules/auth/auth.service';
import { KeyResponseDto } from '@modules/auth/dto';
import { CurrencyService } from '@modules/ledger/services/currency.service';
import { LedgerAccountService } from '@modules/ledger/services/ledger-account.service';
import { LedgerTransactionService } from '@modules/ledger/services/ledger-transaction.service';
import { LedgerService } from '@modules/ledger/services/ledger.service';
import { Ledger, LedgerAccount, LedgerTransaction } from '@modules/ledger/types';

describe('LedgerEntryController', () => {
  const ctx = setupTestContext();
  let authKey: KeyResponseDto;
  let ledger1: Ledger;
  let ledger2: Ledger;
  let usdCreditAccount1: LedgerAccount;
  let usdDebitAccount1: LedgerAccount;
  let eurCreditAccount1: LedgerAccount;
  let eurDebitAccount1: LedgerAccount;
  let usdCreditAccount2: LedgerAccount;
  let usdDebitAccount2: LedgerAccount;
  const transactions: LedgerTransaction[] = [];

  beforeAll(async () => {
    const authService = ctx.app.get(AuthService);
    authKey = await authService.createKey({});

    const ledgerService = ctx.app.get(LedgerService);
    const ledgerAccountService = ctx.app.get(LedgerAccountService);
    const transactionService = ctx.app.get(LedgerTransactionService);
    const currencyService = ctx.app.get(CurrencyService);

    const usdCurrency = await currencyService.findByCode('USD');
    const eurCurrency = await currencyService.findByCode('EUR');

    // Create two ledgers
    ledger1 = await ledgerService.createLedger({
      name: 'Ledger 1',
      description: 'First test ledger',
      metadata: {},
    });

    ledger2 = await ledgerService.createLedger({
      name: 'Ledger 2',
      description: 'Second test ledger',
      metadata: {},
    });

    // Create accounts on ledger1 (USD and EUR)
    usdCreditAccount1 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger1.id,
      name: 'USD Credit Account 1',
      description: 'USD credit account on ledger 1',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
      externalId: uuidV7(),
    });

    usdDebitAccount1 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger1.id,
      name: 'USD Debit Account 1',
      description: 'USD debit account on ledger 1',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      externalId: uuidV7(),
    });

    eurCreditAccount1 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger1.id,
      name: 'EUR Credit Account 1',
      description: 'EUR credit account on ledger 1',
      currency: eurCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
      externalId: uuidV7(),
    });

    eurDebitAccount1 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger1.id,
      name: 'EUR Debit Account 1',
      description: 'EUR debit account on ledger 1',
      currency: eurCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      externalId: uuidV7(),
    });

    // Create accounts on ledger2 (USD only)
    usdCreditAccount2 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'USD Credit Account 2',
      description: 'USD credit account on ledger 2',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.CREDIT,
      externalId: uuidV7(),
    });

    usdDebitAccount2 = await ledgerAccountService.createLedgerAccount({
      ledgerId: ledger2.id,
      name: 'USD Debit Account 2',
      description: 'USD debit account on ledger 2',
      currency: usdCurrency.code,
      normalBalance: NormalBalanceEnum.DEBIT,
      externalId: uuidV7(),
    });

    // Create transactions with entries
    // Transaction 1: USD on ledger1
    const txn1 = await transactionService.record({
      description: 'USD Transaction 1',
      externalId: uuidV7(),
      status: LedgerTransactionStatusEnum.POSTED,
      metadata: { category: 'test', type: 'payment' },
      ledgerEntries: [
        {
          sourceAccountId: usdDebitAccount1.id,
          destinationAccountId: usdCreditAccount1.id,
          amount: 100,
        },
      ],
    });
    transactions.push(txn1);

    // Transaction 2: EUR on ledger1
    const txn2 = await transactionService.record({
      description: 'EUR Transaction 1',
      status: LedgerTransactionStatusEnum.POSTED,
      externalId: uuidV7(),
      metadata: { category: 'test', type: 'transfer' },
      ledgerEntries: [
        {
          sourceAccountId: eurDebitAccount1.id,
          destinationAccountId: eurCreditAccount1.id,
          amount: 200,
        },
      ],
    });
    transactions.push(txn2);

    // Transaction 3: USD on ledger2
    const txn3 = await transactionService.record({
      description: 'USD Transaction 2',
      status: LedgerTransactionStatusEnum.POSTED,
      externalId: uuidV7(),
      metadata: { category: 'test', type: 'payment' },
      ledgerEntries: [
        {
          sourceAccountId: usdDebitAccount2.id,
          destinationAccountId: usdCreditAccount2.id,
          amount: 300,
        },
      ],
    });
    transactions.push(txn3);

    // Transaction 4: Multiple entries on ledger1
    const txn4 = await transactionService.record({
      description: 'Multi-entry Transaction',
      externalId: uuidV7(),
      metadata: { category: 'bulk', type: 'batch' },
      status: LedgerTransactionStatusEnum.POSTED,
      ledgerEntries: [
        {
          sourceAccountId: usdDebitAccount1.id,
          destinationAccountId: usdCreditAccount1.id,
          amount: 50,
        },
        {
          sourceAccountId: eurDebitAccount1.id,
          destinationAccountId: eurCreditAccount1.id,
          amount: 75,
        },
      ],
    });
    transactions.push(txn4);

    // Transaction 5: Another USD on ledger1
    const txn5 = await transactionService.record({
      description: 'USD Transaction 3',
      externalId: uuidV7(),
      metadata: { category: 'test', type: 'refund' },
      status: LedgerTransactionStatusEnum.POSTED,
      ledgerEntries: [
        {
          sourceAccountId: usdCreditAccount1.id,
          destinationAccountId: usdDebitAccount1.id,
          amount: 25,
        },
      ],
    });
    transactions.push(txn5);
  });

  describe('GET /v1/ledger_entries', () => {
    const endpoint = '/v1/ledger_entries';

    describe('Authentication', () => {
      it('should return 401 when auth is not provided', async () => {
        return request(ctx.app.getHttpServer()).get(endpoint).expect(HttpStatus.UNAUTHORIZED);
      });
    });

    describe('Basic Listing', () => {
      it('should list entries with default pagination', async () => {
        return request(ctx.app.getHttpServer())
          .get(endpoint)
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.hasNext).toBeDefined();
            expect(response.body.hasPrev).toBeDefined();

            const entry = response.body.data[0];
            expect(entry.id).toBeDefined();
            expect(entry.amount).toBeDefined();
            expect(entry.direction).toBeDefined();
            expect(entry.ledgerId).toBeDefined();
            expect(entry.ledgerTransaction.id).toBeDefined();
            expect(entry.ledgerAccount.id).toBeDefined();
            expect(entry.currency.code).toBeDefined();
            expect(entry.currency.exponent).toBeDefined();
            expect(entry.createdAt).toBeDefined();
            expect(entry.updatedAt).toBeDefined();
          });
      });

      it('should list entries with custom limit', async () => {
        return request(ctx.app.getHttpServer())
          .get(endpoint)
          .query({ limit: 3 })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            expect(response.body.data.length).toBeLessThanOrEqual(3);
          });
      });

      it('should return entries in descending order by default', async () => {
        return request(ctx.app.getHttpServer())
          .get(endpoint)
          .query({ limit: 10 })
          .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
          .expect(HttpStatus.OK)
          .expect((response) => {
            const entries = response.body.data;
            for (let i = 1; i < entries.length; i++) {
              expect(entries[i - 1].id > entries[i].id).toBe(true);
            }
          });
      });
    });

    describe('Filtering', () => {
      describe('Filter by ledgerId', () => {
        it('should filter entries by ledgerId (ledger1)', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ ledgerId: ledger1.id })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerId).toBe(ledger1.id);
              });
            });
        });

        it('should filter entries by ledgerId (ledger2)', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ ledgerId: ledger2.id })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerId).toBe(ledger2.id);
              });
            });
        });

        it('should return empty array for non-existent ledgerId', async () => {
          const nonExistentId = uuidV7();
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ ledgerId: nonExistentId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });

      describe('Filter by transactionId', () => {
        it('should filter entries by transaction ID (native)', async () => {
          const targetTransaction = transactions[0];
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ transactionId: targetTransaction.id })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBe(2); // Should have 2 entries (debit and credit)
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerTransaction.id).toBe(targetTransaction.id);
              });
            });
        });

        it('should return empty array for non-existent transactionId', async () => {
          const nonExistentId = uuidV7();
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ transactionId: nonExistentId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });

      describe('Filter by transactionExternalId', () => {
        it('should filter entries by transaction external ID', async () => {
          const targetTransaction = transactions[1];
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ transactionExternalId: targetTransaction.externalId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBe(2); // Should have 2 entries
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerTransaction.id).toBe(targetTransaction.id);
              });
            });
        });

        it('should return empty array for non-existent transactionExternalId', async () => {
          const nonExistentId = 'nonexistent_external_id';
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ transactionExternalId: nonExistentId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });

      describe('Filter by accountId', () => {
        it('should filter entries by account ID (native)', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ accountId: usdCreditAccount1.id })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerAccount.id).toBe(usdCreditAccount1.id);
              });
            });
        });

        it('should return empty array for non-existent accountId', async () => {
          const nonExistentId = uuidV7();
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ accountId: nonExistentId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });

      describe('Filter by accountExternalId', () => {
        it('should filter entries by account external ID', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ accountExternalId: usdDebitAccount1.externalId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerAccount.id).toBe(usdDebitAccount1.id);
              });
            });
        });

        it('should return empty array for non-existent accountExternalId', async () => {
          const nonExistentId = 'nonexistent_external_id';
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ accountExternalId: nonExistentId })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });

      describe('Filter by balanceDirection', () => {
        it('should filter entries by credit direction', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ balanceDirection: NormalBalanceEnum.CREDIT })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.direction).toBe(NormalBalanceEnum.CREDIT);
              });
            });
        });

        it('should filter entries by debit direction', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ balanceDirection: NormalBalanceEnum.DEBIT })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.direction).toBe(NormalBalanceEnum.DEBIT);
              });
            });
        });
      });

      describe('Combined filters', () => {
        it('should combine ledgerId and balanceDirection filters', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              ledgerId: ledger1.id,
              balanceDirection: NormalBalanceEnum.CREDIT,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerId).toBe(ledger1.id);
                expect(entry.direction).toBe(NormalBalanceEnum.CREDIT);
              });
            });
        });

        it('should combine accountId and transactionId filters', async () => {
          const targetTransaction = transactions[0];
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              accountId: usdCreditAccount1.id,
              transactionId: targetTransaction.id,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBe(1);
              expect(response.body.data[0].ledgerAccount.id).toBe(usdCreditAccount1.id);
              expect(response.body.data[0].ledgerTransaction.id).toBe(targetTransaction.id);
            });
        });

        it('should combine ledgerId, accountId and balanceDirection', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              ledgerId: ledger2.id,
              accountId: usdDebitAccount2.id,
              balanceDirection: NormalBalanceEnum.DEBIT,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              response.body.data.forEach((entry: any) => {
                expect(entry.ledgerId).toBe(ledger2.id);
                expect(entry.ledgerAccount.id).toBe(usdDebitAccount2.id);
                expect(entry.direction).toBe(NormalBalanceEnum.DEBIT);
              });
            });
        });

        it('should return empty array when combined filters do not match', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              ledgerId: ledger1.id,
              accountId: usdCreditAccount2.id, // This account belongs to ledger2
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data).toEqual([]);
            });
        });
      });
    });

    describe('Pagination', () => {
      describe('Forward pagination', () => {
        it('should navigate to next page using nextCursor', async () => {
          // Get first page
          const firstPageResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ limit: 3 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          if (!firstPageResponse.body.hasNext) {
            return; // Skip if not enough data for pagination
          }

          expect(firstPageResponse.body.nextCursor).toBeDefined();

          // Get second page using nextCursor
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              limit: 3,
              cursor: firstPageResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(response.body.data.length).toBeGreaterThan(0);
              expect(response.body.data.length).toBeLessThanOrEqual(3);

              // Verify no overlap with first page
              const firstPageIds = firstPageResponse.body.data.map((e: any) => e.id);
              const secondPageIds = response.body.data.map((e: any) => e.id);
              const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
              expect(overlap.length).toBe(0);
            });
        });

        it('should handle sequential forward pagination', async () => {
          let currentCursor: string | undefined;
          const allRetrievedEntries: string[] = [];
          const pageSize = 2;
          let pageCount = 0;

          // Navigate through multiple pages
          while (pageCount < 5) {
            const response = await request(ctx.app.getHttpServer())
              .get(endpoint)
              .query({
                limit: pageSize,
                ...(currentCursor && { cursor: currentCursor, direction: 'next' }),
              })
              .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
              .expect(HttpStatus.OK);

            const entries = response.body.data;
            const entryIds = entries.map((e: any) => e.id);

            // Verify no duplicates across pages
            const duplicates = entryIds.filter((id: string) => allRetrievedEntries.includes(id));
            expect(duplicates.length).toBe(0);

            allRetrievedEntries.push(...entryIds);

            if (!response.body.hasNext) break;
            currentCursor = response.body.nextCursor;
            pageCount++;
          }

          expect(allRetrievedEntries.length).toBeGreaterThan(pageSize);
        });
      });

      describe('Backward pagination', () => {
        it('should navigate to previous page using prevCursor', async () => {
          const firstPageResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ limit: 3 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          if (!firstPageResponse.body.hasNext) {
            return; // Skip if not enough data
          }

          const secondPageResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              limit: 3,
              cursor: firstPageResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          expect(secondPageResponse.body.hasPrev).toBe(true);
          expect(secondPageResponse.body.prevCursor).toBeDefined();

          // Navigate back to first page
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              limit: 3,
              cursor: secondPageResponse.body.prevCursor,
              direction: 'prev',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              // Should get back the original first page data
              const originalIds = firstPageResponse.body.data.map((e: any) => e.id);
              const backNavigatedIds = response.body.data.map((e: any) => e.id);
              expect(backNavigatedIds).toEqual(originalIds);
            });
        });
      });

      describe('Bidirectional navigation', () => {
        it('should maintain consistency when navigating forward and backward', async () => {
          // Start from initial page
          const initialResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ limit: 2 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          if (!initialResponse.body.hasNext) {
            return; // Skip if not enough data
          }

          // Go forward one page
          const forwardResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              limit: 2,
              cursor: initialResponse.body.nextCursor,
              direction: 'next',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Go back to original position
          const backResponse = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              limit: 2,
              cursor: forwardResponse.body.prevCursor,
              direction: 'prev',
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Should match original data
          const originalIds = initialResponse.body.data.map((e: any) => e.id);
          const returnedIds = backResponse.body.data.map((e: any) => e.id);
          expect(returnedIds).toEqual(originalIds);
        });
      });

      describe('Edge cases', () => {
        it('should handle empty result set', async () => {
          return request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({ ledgerId: uuidV7() }) // Non-existent ledger
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
            .get(endpoint)
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
            .get(endpoint)
            .query({ limit: 1000 })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK)
            .expect((response) => {
              expect(Array.isArray(response.body.data)).toBe(true);
              expect(response.body.data.length).toBeGreaterThan(0);
            });
        });
      });

      describe('Pagination with filters', () => {
        it('should combine pagination with ledger filter', async () => {
          const firstPage = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              ledgerId: ledger1.id,
              limit: 2,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          expect(firstPage.body.data.length).toBeGreaterThan(0);
          firstPage.body.data.forEach((entry: any) => {
            expect(entry.ledgerId).toBe(ledger1.id);
          });

          if (!firstPage.body.hasNext) return; // Skip if only one page

          // Get second page with same filter
          const secondPage = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              ledgerId: ledger1.id,
              cursor: firstPage.body.nextCursor,
              direction: 'next',
              limit: 2,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Verify all results still match the filter
          secondPage.body.data.forEach((entry: any) => {
            expect(entry.ledgerId).toBe(ledger1.id);
          });

          // Verify no overlap
          const firstPageIds = firstPage.body.data.map((e: any) => e.id);
          const secondPageIds = secondPage.body.data.map((e: any) => e.id);
          const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
          expect(overlap.length).toBe(0);
        });

        it('should maintain pagination consistency with direction filter across pages', async () => {
          const firstPage = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              balanceDirection: NormalBalanceEnum.CREDIT,
              limit: 2,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          if (!firstPage.body.hasNext) return; // Skip if only one page

          const secondPage = await request(ctx.app.getHttpServer())
            .get(endpoint)
            .query({
              balanceDirection: NormalBalanceEnum.CREDIT,
              cursor: firstPage.body.nextCursor,
              direction: 'next',
              limit: 2,
            })
            .set(setTestBasicAuthHeader(authKey.id, authKey.secret))
            .expect(HttpStatus.OK);

          // Verify all results still match the filter
          secondPage.body.data.forEach((entry: any) => {
            expect(entry.direction).toBe(NormalBalanceEnum.CREDIT);
          });

          // Verify no overlap
          const firstPageIds = firstPage.body.data.map((e: any) => e.id);
          const secondPageIds = secondPage.body.data.map((e: any) => e.id);
          const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
          expect(overlap.length).toBe(0);
        });
      });
    });
  });
});
