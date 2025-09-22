import BigNumber from 'bignumber.js';
import { AccountFlags, Account as TigerBeetleAccount, id } from 'tigerbeetle-node';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CursorPaginatedResult, Transactional, cursorPaginate } from '@libs/database';
import { NormalBalanceEnum } from '@libs/enums';
import { TigerBeetleService } from '@libs/tigerbeetle/tigerbeetle.service';

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

    const accountObj = this.ledgerAccountRepository.create({
      ledgerId: data.ledgerId,
      name: data.name,
      currencyCode: currency.code,
      description: data.description,
      externalId: data.externalId,
      normalBalance: data.normalBalance,
      tigerBeetleId: id(),
    });


    const savedAccount = await this.ledgerAccountRepository.save(accountObj);

    const metadata: LedgerAccountMetadataEntity[] = Object.entries(data.metadata ?? {}).map(
      ([key, value]) => {
        return this.ledgerAccountMetadataRepository.create({
          ledgerAccount: savedAccount,
          key,
          value,
        });
      },
    );

    

    if (metadata.length > 0) await this.ledgerAccountMetadataRepository.save(metadata);

    savedAccount.metadata = metadata;

    // Create account on tigerbeetle and save it
    await this.tigerBeetleService.createAccount({
      id: savedAccount.tigerBeetleId,
      debits_pending: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      debits_posted: 0n,
      ledger: ledger.tigerBeetleId,
      timestamp: 0n,
      reserved: 0,
      flags:
        savedAccount.normalBalance === NormalBalanceEnum.CREDIT
          ? AccountFlags.debits_must_not_exceed_credits
          : AccountFlags.credits_must_not_exceed_debits,
      // todo; might be good to use theses fields to link accounts together
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: savedAccount.normalBalance === NormalBalanceEnum.CREDIT ? 1 : 0, // account normal balance
      code: currency.id,
    });

    const tbAccount = await this.tigerBeetleService.retrieveAccount(savedAccount.tigerBeetleId);
    this.parseAccountBalanceFromTBAccount(savedAccount, tbAccount);

    return savedAccount;
  }

  async retrieveLedgerAccount(id: string): Promise<LedgerAccountEntity> {
    const response = await this.ledgerAccountRepository.findOneOrFail({
      where: { id },
      relations: ['metadata', 'currency'],
    });

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
    const ledger = await this.ledgerAccountRepository.findOneOrFail({
      where: { id },
      relations: ['metadata', 'currency'],
    });

    ledger.name = data.name ?? ledger.name;
    ledger.description = data.description ?? ledger.description;
    await this.ledgerAccountRepository.save(ledger);

    for (const [key, value] of Object.entries(data.metadata ?? {})) {
      if (value === null || value === undefined) {
        // Remove metadata where value is null
        await this.ledgerAccountMetadataRepository.delete({
          ledgerAccount: { id },
          key: key,
        });
      } else {
        // Upsert metadata (update if exists, create if not)
        await this.ledgerAccountMetadataRepository.upsert(
          {
            ledgerAccount: { id },
            key: key,
            value: value,
          },
          ['ledgerAccount', 'key'],
        );
      }
    }
    const updateLedgerAccount = await this.ledgerAccountRepository.findOne({
      where: { id },
      relations: ['metadata', 'currency'],
    });

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
        currency: entity.currency.code,
        currencyExponent: entity.currency.exponent,
      },
      postedBalance: {
        credits: postedCredit,
        debits: postedDebit,
        amount: postedAmount,
        currency: entity.currency.code,
        currencyExponent: entity.currency.exponent,
      },
      avalaibleBalance: {
        credits: postedCredit,
        debits: pendingDebit,
        amount: availableAmount,
        currency: entity.currency.code,
        currencyExponent: entity.currency.exponent,
      },
    };
  }
}
