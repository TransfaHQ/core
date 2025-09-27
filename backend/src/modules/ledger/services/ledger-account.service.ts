import { EntityRepository, Transactional, ref } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';

import BigNumber from 'bignumber.js';
import { AccountFlags, Account as TigerBeetleAccount, id } from 'tigerbeetle-node';
import { validate } from 'uuid';

import { Injectable } from '@nestjs/common';

import { CursorPaginatedResult, cursorPaginate } from '@libs/database';
import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';
import { uuidV7 } from '@libs/utils/uuid';

import { CreateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/create-ledger-account.dto';
import { UpdateLedgerAccountDto } from '@modules/ledger/dto/ledger-account/update-ledger-account.dto';
import { LedgerAccountEntity } from '@modules/ledger/entities/ledger-account.entity';
import { LedgerAccountMetadataEntity } from '@modules/ledger/entities/ledger-metadata.entity';
import { LedgerEntity } from '@modules/ledger/entities/ledger.entity';
import { CurrencyService } from '@modules/ledger/services/currency.service';

@Injectable()
export class LedgerAccountService {
  constructor(
    @InjectRepository(LedgerAccountEntity)
    private readonly ledgerAccountRepository: EntityRepository<LedgerAccountEntity>,
    private readonly tigerBeetleService: TigerBeetleService,
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: EntityRepository<LedgerEntity>,
    @InjectRepository(LedgerAccountMetadataEntity)
    private readonly ledgerAccountMetadataRepository: EntityRepository<LedgerAccountMetadataEntity>,
    private readonly currencyService: CurrencyService,
    private readonly em: EntityManager,
  ) {}

  @Transactional()
  async createLedgerAccount(data: CreateLedgerAccountDto): Promise<LedgerAccountEntity> {
    const ledger = await this.ledgerRepository.findOneOrFail({ id: data.ledgerId });

    // Get currency from database
    const currency = await this.currencyService.findByCode(data.currency);

    const account = new LedgerAccountEntity({
      id: uuidV7(),
      ledger: ref(LedgerEntity, data.ledgerId),
      name: data.name,
      currencyCode: data.currency,
      description: data.description,
      externalId: data.externalId,
      normalBalance: data.normalBalance,
      tigerBeetleId: id(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currencyExponent: currency.exponent,
    });

    await this.em.persist(account);

    const metadata: LedgerAccountMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        return new LedgerAccountMetadataEntity({
          ledgerAccount: ref(LedgerAccountEntity, account.id),
          key,
          value,
        });
      },
    );

    if (metadata.length > 0) await this.em.persist(metadata);

    // Create account on tigerbeetle and save it
    await this.tigerBeetleService.createAccount({
      id: account.tigerBeetleId,
      debits_pending: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      debits_posted: 0n,
      ledger: ledger.tigerBeetleId,
      timestamp: 0n,
      reserved: 0,
      flags:
        account.normalBalance === NormalBalanceEnum.CREDIT
          ? AccountFlags.debits_must_not_exceed_credits
          : AccountFlags.credits_must_not_exceed_debits,
      // todo; might be good to use theses fields to link accounts together
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: account.normalBalance === NormalBalanceEnum.CREDIT ? 1 : 0, // account normal balance
      code: currency.id,
    });

    const tbAccount = await this.tigerBeetleService.retrieveAccount(account.tigerBeetleId);
    this.parseAccountBalanceFromTBAccount(account, tbAccount);
    await this.em.flush();
    return account;
  }

  async retrieveLedgerAccount(id: string): Promise<LedgerAccountEntity> {
    const response = await this.ledgerAccountRepository.findOneOrFail(
      { $or: validate(id) ? [{ externalId: id }, { id }] : [{ externalId: id }] },
      {
        populate: ['metadata'],
      },
    );

    const tbAccount = await this.tigerBeetleService.retrieveAccount(response.tigerBeetleId);
    this.parseAccountBalanceFromTBAccount(response, tbAccount);
    return response;
  }

  async paginate(
    limit?: number,
    cursor?: string,
    ledgerId?: string,
    currency?: string,
    normalBalance?: string,
    search?: string,
    metadata?: Record<string, string>,
  ): Promise<CursorPaginatedResult<LedgerAccountEntity>> {
    const qb = this.em
      .qb(LedgerAccountEntity, 'la')
      .leftJoinAndSelect('la.metadata', 'lam')
      .getKnex()
      .distinctOn('la.id');

    if (ledgerId) {
      qb.andWhere({ ledger: ledgerId });
    }
    if (currency) {
      qb.andWhere({ currencyCode: currency });
    }
    if (normalBalance) {
      qb.andWhere({ normalBalance });
    }
    if (search) {
      qb.orWhere([
        { name: { $ilike: `%${search}%` } },
        { description: { $ilike: `%${search}%` } },
        { externalId: { $ilike: `%${search}%` } },
      ]);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      Object.entries(metadata).forEach(([key, value]) =>
        qb.andWhere({ $and: [{ 'lam.key': key }, { 'lam.value': value }] }),
      );
    }

    const response = await cursorPaginate<LedgerAccountEntity>({
      qb,
      limit,
      cursor,
      order: 'ASC',
    });
    const tbAccounts = await this.tigerBeetleService.retrieveAccounts(
      response.data.map((v) => v.tigerBeetleId),
    );

    return {
      ...response,
      data: response.data.map((entity) => {
        const tbAccount = tbAccounts.filter((account) => account.id === entity.tigerBeetleId)[0];
        this.parseAccountBalanceFromTBAccount(entity, tbAccount);
        return entity;
      }),
    };
  }

  @Transactional()
  async update(id: string, data: UpdateLedgerAccountDto): Promise<LedgerAccountEntity> {
    const account = await this.ledgerAccountRepository.findOneOrFail({ id });

    account.name = data.name ?? account.name;
    account.description = data.description ?? account.description;

    const metadataKeyToDelete: string[] = [];
    const metadataToUpdate: LedgerAccountMetadataEntity[] = [];

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined || !value) {
        metadataKeyToDelete.push(key);
      } else {
        const meta = new LedgerAccountMetadataEntity();
        meta.key = key;
        meta.value = value;
        meta.ledgerAccount = account;
        metadataToUpdate.push(meta);
      }
    }

    if (metadataKeyToDelete.length) {
      await this.ledgerAccountMetadataRepository.nativeDelete({
        ledgerAccount: { id },
        key: { $in: metadataKeyToDelete },
      });
    }

    // Upsert metadata (update if exists, create if not)
    if (metadataToUpdate.length > 0) {
      await this.em.upsertMany(LedgerAccountMetadataEntity, metadataToUpdate, {
        onConflictFields: ['ledgerAccount', 'key'],
      });
    }

    await this.em.flush();

    const updateLedgerAccount = await this.ledgerAccountRepository.findOneOrFail(
      { id },
      { populate: ['metadata'] },
    );

    const tbAccount = await this.tigerBeetleService.retrieveAccount(
      updateLedgerAccount.tigerBeetleId,
    );
    this.parseAccountBalanceFromTBAccount(updateLedgerAccount, tbAccount);
    return updateLedgerAccount;
  }

  private parseAccountBalanceFromTBAccount(
    entity: LedgerAccountEntity,
    tbAccount: TigerBeetleAccount,
  ): void {
    /**
     * Summed amounts of all posted and pending ledger entries with debit direction.
     */
    const pendingDebit = BigNumber(tbAccount.debits_posted)
      .plus(tbAccount.debits_pending)
      .toNumber();

    /**
     * 	Summed amounts of all posted and pending ledger entries with credit direction.
     */
    const pendingCredit = BigNumber(tbAccount.credits_pending)
      .plus(tbAccount.credits_posted)
      .toNumber();

    /**
     * Credit Normal: pending_balance["credits"] - pending_balance["debits"]
     * Debit Normal: pending_balance["debits"] - pending_balance["credits"]
     */
    let pendingAmount = 0;

    if (entity.normalBalance === NormalBalanceEnum.CREDIT) {
      pendingAmount = BigNumber(pendingCredit).minus(pendingDebit).toNumber();
    } else {
      pendingAmount = BigNumber(pendingDebit).minus(pendingCredit).toNumber();
    }

    /**
     * Sum amounts of all posted ledger entries with debit direction.
     */
    const postedDebit = BigNumber(tbAccount.debits_posted).toNumber();

    /**
     * 	Sum amounts of all posted ledger entries with credit direction.
     */
    const postedCredit = BigNumber(tbAccount.credits_posted).toNumber();

    /**
     * Credit Normal: posted_balance["credits"] - posted_balance["debits"]
     * Debit Normal: posted_balance["debits"] - posted_balance["credits"]
     */
    let postedAmount = 0;

    if (entity.normalBalance === NormalBalanceEnum.CREDIT) {
      postedAmount = BigNumber(postedCredit).minus(postedDebit).toNumber();
    } else {
      postedAmount = BigNumber(postedDebit).minus(postedCredit).toNumber();
    }

    /**
     * Credit Normal: posted_balance["credits"] - pending_balance["debits"]
     * Debit Normal: posted_balance["debits"] - pending_balance["credits"]
     */
    let availableAmount = 0;
    if (entity.normalBalance === NormalBalanceEnum.CREDIT) {
      availableAmount = BigNumber(postedCredit).minus(pendingDebit).toNumber();
    } else {
      availableAmount = BigNumber(postedDebit).minus(pendingCredit).toNumber();
    }

    entity.balances = {
      pendingBalance: {
        credits: pendingCredit,
        debits: pendingDebit,
        amount: pendingAmount,
        currency: entity.currencyCode,
        currencyExponent: entity.currencyExponent,
      },
      postedBalance: {
        credits: postedCredit,
        debits: postedDebit,
        amount: postedAmount,
        currency: entity.currencyCode,
        currencyExponent: entity.currencyExponent,
      },
      avalaibleBalance: {
        credits: postedCredit,
        debits: pendingDebit,
        amount: availableAmount,
        currency: entity.currencyCode,
        currencyExponent: entity.currencyExponent,
      },
    };
  }
}
