import { NormalBalanceEnum } from '@libs/enums';

import { LedgerAccountResponseDto } from '@modules/ledger/dto/ledger-account/ledger-account-response.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';
import {
  LedgerEntryResponseDto,
  LedgerTransactionResponseDto,
} from '@modules/ledger/dto/ledger-transaction/ledger-transaction-response.dto';

import { Ledger, LedgerAccount, LedgerEntry, LedgerTransaction } from '../types';

export const ledgerAccountToApiV1Response = (entity: LedgerAccount): LedgerAccountResponseDto => {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description ?? null,
    normalBalance: entity.normalBalance,
    ledgerId: entity.ledgerId,
    externalId: entity.externalId,
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
  return {
    id: entity.id,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    amount: +entity.amount,
    direction: entity.direction as NormalBalanceEnum,
    ledgerAccountId: entity.ledgerAccountId,
    ledgerAccountCurrency: entity.ledgerAccount!.currencyCode,
    ledgerAccountCurrencyExponent: entity.ledgerAccount!.currencyExponent,
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
    ledgerEntries: entity.ledgerEntries.map(ledgerEntryToApiV1Response),
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
  };
};
