import BigNumber from 'bignumber.js';
import { AccountFlags, Account as TigerBeetleAccount, id } from 'tigerbeetle-node';
import { In, Repository } from 'typeorm';
import { validate } from 'uuid';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, Transactional, cursorPaginate } from '@libs/database';
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
    private readonly ledgerAccountRepository: Repository<LedgerAccountEntity>,
    private readonly tigerBeetleService: TigerBeetleService,
    @InjectRepository(LedgerEntity)
    private readonly ledgerRepository: Repository<LedgerEntity>,
    @InjectRepository(LedgerAccountMetadataEntity)
    private readonly ledgerAccountMetadataRepository: Repository<LedgerAccountMetadataEntity>,
    private readonly currencyService: CurrencyService,
  ) {}

  @Transactional()
  async createLedgerAccount(data: CreateLedgerAccountDto): Promise<LedgerAccountEntity> {
    const ledger = await this.ledgerRepository.findOneByOrFail({ id: data.ledgerId });

    // Get currency from database
    const currency = await this.currencyService.findByCode(data.currency);

    const account = this.ledgerAccountRepository.create({
      id: uuidV7(),
      ledgerId: data.ledgerId,
      name: data.name,
      currencyCode: currency.code,
      description: data.description,
      externalId: data.externalId,
      normalBalance: data.normalBalance,
      tigerBeetleId: id(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currencyExponent: currency.exponent,
    });

    await this.ledgerAccountRepository.insert(account);

    const metadata: LedgerAccountMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        return this.ledgerAccountMetadataRepository.create({
          ledgerAccount: { id: account.id },
          key,
          value,
        });
      },
    );

    if (metadata.length > 0) await this.ledgerAccountMetadataRepository.insert(metadata);

    account.metadata = metadata;

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

    return account;
  }

  async retrieveLedgerAccount(id: string): Promise<LedgerAccountEntity> {
    let qb = this.ledgerAccountRepository
      .createQueryBuilder('la')
      .leftJoinAndSelect('la.metadata', 'metadata')
      .where('la.externalId = :externalId', { externalId: id });

    if (validate(id)) qb = qb.orWhere('la.id = :id', { id });
    const response = await qb.getOneOrFail();

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
    const response = await cursorPaginate<LedgerAccountEntity>({
      repo: this.ledgerAccountRepository,
      limit,
      cursor,
      order: 'ASC',
      relations: ['metadata', 'currency'],
      where: (qb) => {
        if (ledgerId) {
          qb = qb.andWhere('entity.ledgerId = :ledgerId', { ledgerId });
        }
        if (currency) {
          qb = qb.andWhere('entity.currencyCode = :currency', { currency });
        }
        if (normalBalance) {
          qb = qb.andWhere('entity.normalBalance = :normalBalance', { normalBalance });
        }
        if (search) {
          qb = qb.andWhere(
            '(LOWER(entity.name) LIKE LOWER(:search) OR LOWER(entity.description) LIKE LOWER(:search) OR LOWER(entity.externalId) LIKE LOWER(:search))',
            { search: `%${search}%` }
          );
        }
        if (metadata && Object.keys(metadata).length > 0) {
          Object.entries(metadata).forEach(([key, value], index) => {
            qb = qb.innerJoin(
              'ledger_account_metadata',
              `metadata${index}`,
              `metadata${index}.ledger_account_id = entity.id AND metadata${index}.key = :metaKey${index} AND metadata${index}.value = :metaValue${index}`,
              { [`metaKey${index}`]: key, [`metaValue${index}`]: value }
            );
          });
        }
        return qb;
      },
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
    const account = await this.ledgerAccountRepository
      .createQueryBuilder('la')
      .where('la.id = :id', { id })
      .getOneOrFail();

    account.name = data.name ?? account.name;
    account.description = data.description ?? account.description;
    await this.ledgerAccountRepository.update({ id: account.id }, account);

    const metadataKeyToDelete: string[] = [];
    const metadataToUpdate: LedgerAccountMetadataEntity[] = [];

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined || !value) {
        metadataKeyToDelete.push(key);
      } else {
        metadataToUpdate.push(
          this.ledgerAccountMetadataRepository.create({
            ledgerAccount: { id },
            key: key,
            value: value,
          }),
        );
      }
    }

    if (metadataKeyToDelete.length) {
      await this.ledgerAccountMetadataRepository.delete({
        ledgerAccount: { id },
        key: In(metadataKeyToDelete),
      });
    }

    // Upsert metadata (update if exists, create if not)
    if (metadataToUpdate.length > 0) {
      await this.ledgerAccountMetadataRepository.upsert(metadataToUpdate, ['ledgerAccount', 'key']);
    }

    const updateLedgerAccount = await this.ledgerAccountRepository
      .createQueryBuilder('la')
      .leftJoinAndSelect('la.metadata', 'metadata')
      .where('la.id = :id', { id })
      .getOne();

    const tbAccount = await this.tigerBeetleService.retrieveAccount(
      updateLedgerAccount!.tigerBeetleId,
    );
    this.parseAccountBalanceFromTBAccount(updateLedgerAccount!, tbAccount);
    return updateLedgerAccount!;
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
