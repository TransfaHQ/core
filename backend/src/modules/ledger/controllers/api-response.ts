import { BigNumber } from 'bignumber.js';

import { LedgerTransactionStatusEnum, NormalBalanceEnum } from '@libs/enums';

import { CurrencyResponseDto } from '@modules/ledger/dto/currency/currency-response.dto';
import { LedgerAccountResponseDto } from '@modules/ledger/dto/ledger-account/ledger-account-response.dto';
import { LedgerEntryStandaloneResponseDto } from '@modules/ledger/dto/ledger-entry/ledger-entry-response.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import {
  LedgerEntryResponseDto,
  LedgerTransactionResponseDto,
} from '@modules/ledger/dto/ledger-transaction/ledger-transaction-response.dto';
import { LedgerEntryResponse } from '@modules/ledger/services/ledger-entry.service';

import { Currency, Ledger, LedgerAccount, LedgerEntry, LedgerTransaction } from '../types';

export const ledgerAccountToApiV1Response = (entity: LedgerAccount): LedgerAccountResponseDto => {
  const currencyExponentMultiplier = BigNumber(10).pow(entity.currencyExponent);
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description ?? null,
    normalBalance: entity.normalBalance,
    ledgerId: entity.ledgerId,
    externalId: entity.externalId,
    maxBalanceLimit: entity.maxBalanceLimit
      ? BigNumber(entity.maxBalanceLimit).dividedBy(currencyExponentMultiplier).toNumber()
      : null,
    minBalanceLimit: entity.minBalanceLimit
      ? BigNumber(entity.minBalanceLimit).dividedBy(currencyExponentMultiplier).toNumber()
      : null,
    balances: entity.balances,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};

export const ledgerToApiV1Response = (entity: Ledger): LedgerResponseDto => {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};

export const ledgerEntryToApiV1Response = (entity: LedgerEntry): LedgerEntryResponseDto => {
  const currencyExponent = entity.ledgerAccount!.currencyExponent;
  const decimalAmount = +entity.amount / Math.pow(10, currencyExponent);

  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    amount: decimalAmount,
    direction: entity.direction as NormalBalanceEnum,
    ledgerAccountId: entity.ledgerAccountId,
    ledgerAccountCurrency: entity.ledgerAccount!.currencyCode,
    ledgerAccountCurrencyExponent: currencyExponent,
    ledgerAccountName: entity.ledgerAccount!.name,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
  };
};

export const ledgerTransactionToApiV1Resposne = (
  entity: LedgerTransaction,
): LedgerTransactionResponseDto => {
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    description: entity.description,
    externalId: entity.externalId,
    status: entity.status as LedgerTransactionStatusEnum,
    ledgerEntries: entity.ledgerEntries.map(ledgerEntryToApiV1Response),
    effectiveAt: entity.effectiveAt,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
  };
};

export const currencyToApiV1Response = (entity: Currency): CurrencyResponseDto => {
  return {
    id: entity.id,
    code: entity.code,
    exponent: entity.exponent,
    name: entity.name,
    createdAt: entity.createdAt!,
    updatedAt: entity.updatedAt!,
  };
};

export const ledgerEntryStandaloneToApiV1Response = (
  entity: LedgerEntryResponse,
): LedgerEntryStandaloneResponseDto => {
  const decimalAmount = +entity.amount / Math.pow(10, entity.currency.exponent);

  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    amount: decimalAmount,
    direction: entity.direction as NormalBalanceEnum,
    ledgerId: entity.ledgerId,
    ledgerAccount: {
      id: entity.ledgerAccount.id,
      name: entity.ledgerAccount.name,
    },
    ledgerTransaction: {
      id: entity.ledgerTransaction.id,
      externalId: entity.ledgerTransaction.externalId,
    },
    currency: {
      code: entity.currency.code,
      exponent: entity.currency.exponent,
    },
    status: entity.ledgerTransaction.status as LedgerTransactionStatusEnum,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
  };
};
