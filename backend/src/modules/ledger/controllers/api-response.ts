import { LedgerAccountResponseDto } from '@modules/ledger/dto/ledger-account/ledger-account-response.dto';
import { LedgerResponseDto } from '@modules/ledger/dto/ledger-response.dto';

import { Ledger, LedgerAccount } from '../types';

export const ledgerAccountEntityToApiV1Response = (
  entity: LedgerAccount,
): LedgerAccountResponseDto => {
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

export const ledgerEntityToApiV1Response = (entity: Ledger): LedgerResponseDto => {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    metadata: Object.fromEntries((entity.metadata ?? []).map((v) => [v.key, v.value])),
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
};
