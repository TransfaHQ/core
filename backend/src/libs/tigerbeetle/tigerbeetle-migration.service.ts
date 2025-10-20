import { PinoLogger } from 'nestjs-pino';
import { Account, Transfer, createClient } from 'tigerbeetle-node';

import { Injectable } from '@nestjs/common';

import { bufferToTbId } from '@libs/database/utils';

import { TigerbeetleAccountRepository, TigerbeetleTransferRepository } from './repositories';

export interface MigrationProgress {
  totalAccounts: number;
  accountsReplayed: number;
  totalTransfers: number;
  transfersReplayed: number;
  errors: Array<{ type: 'account' | 'transfer'; index: number; error: string }>;
}

export interface MigrationOptions {
  targetClusterId: bigint;
  targetReplicaAddresses: string[];
  batchSize?: number;
  onProgress?: (progress: MigrationProgress) => void;
}

@Injectable()
export class TigerBeetleMigrationService {
  constructor(
    private readonly accountRepository: TigerbeetleAccountRepository,
    private readonly transferRepository: TigerbeetleTransferRepository,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Migrate all TigerBeetle operations from stored data to a new cluster
   */
  async migrateToCluster(options: MigrationOptions): Promise<MigrationProgress> {
    const { targetClusterId, targetReplicaAddresses, batchSize = 100 } = options;

    this.logger.info(`Starting TigerBeetle cluster migration to cluster ${targetClusterId}`);

    // Create client for target cluster
    const targetClient = createClient({
      cluster_id: targetClusterId,
      replica_addresses: targetReplicaAddresses,
    });

    const progress: MigrationProgress = {
      totalAccounts: 0,
      accountsReplayed: 0,
      totalTransfers: 0,
      transfersReplayed: 0,
      errors: [],
    };

    try {
      // Step 1: Replay all accounts
      await this.replayAccounts(targetClient, batchSize, progress, options.onProgress);

      // Step 2: Replay all transfers
      await this.replayTransfers(targetClient, batchSize, progress, options.onProgress);

      this.logger.info('Migration completed successfully', {
        accountsReplayed: progress.accountsReplayed,
        transfersReplayed: progress.transfersReplayed,
        errors: progress.errors.length,
      });
    } catch (error) {
      this.logger.error('Migration failed', error);
      throw error;
    } finally {
      // Clean up client
      targetClient.destroy();
    }

    return progress;
  }

  /**
   * Replay all accounts to the target cluster
   */
  private async replayAccounts(
    targetClient: ReturnType<typeof createClient>,
    batchSize: number,
    progress: MigrationProgress,
    onProgress?: (progress: MigrationProgress) => void,
  ): Promise<void> {
    this.logger.info('Starting account replay...');

    // Get all accounts ordered by creation time
    const storedAccounts = await this.accountRepository.getAllAccountsOrdered();
    progress.totalAccounts = storedAccounts.length;

    this.logger.info(`Found ${storedAccounts.length} accounts to replay`);

    // Process accounts in batches
    for (let i = 0; i < storedAccounts.length; i += batchSize) {
      const batch = storedAccounts.slice(i, Math.min(i + batchSize, storedAccounts.length));

      // Convert stored accounts to TigerBeetle Account format
      const accounts: Account[] = batch.map((stored) => ({
        id: bufferToTbId(stored.accountId),
        debits_posted: BigInt(stored.debitsPosted),
        debits_pending: BigInt(stored.debitsPending),
        credits_posted: BigInt(stored.creditsPosted),
        credits_pending: BigInt(stored.creditsPending),
        user_data_128: stored.userData128 ? bufferToTbId(stored.userData128) : 0n,
        user_data_64: stored.userData64 ? BigInt(stored.userData64) : 0n,
        user_data_32: stored.userData32 || 0,
        ledger: stored.ledger,
        code: stored.code,
        flags: stored.flags,
        timestamp: stored.timestamp ? BigInt(stored.timestamp) : 0n,
        reserved: 0,
      }));

      try {
        const errors = await targetClient.createAccounts(accounts);

        if (errors.length > 0) {
          // Log errors but continue (some might be duplicates which is okay)
          for (const error of errors) {
            this.logger.warn(
              `Account at index ${error.index} in batch ${i / batchSize} failed: ${error.result}`,
            );
            progress.errors.push({
              type: 'account',
              index: i + error.index,
              error: `Error code: ${error.result}`,
            });
          }
        }

        progress.accountsReplayed += batch.length - errors.length;
      } catch (error) {
        this.logger.error(`Failed to replay account batch ${i / batchSize}`, error);
        throw error;
      }

      // Report progress
      if (onProgress) {
        onProgress(progress);
      }

      this.logger.info(`Replayed ${progress.accountsReplayed}/${progress.totalAccounts} accounts`);
    }
  }

  /**
   * Replay all transfers to the target cluster
   */
  private async replayTransfers(
    targetClient: ReturnType<typeof createClient>,
    batchSize: number,
    progress: MigrationProgress,
    onProgress?: (progress: MigrationProgress) => void,
  ): Promise<void> {
    this.logger.info('Starting transfer replay...');

    // Get all transfers ordered by creation time
    const storedTransfers = await this.transferRepository.getAllTransfersOrdered();
    progress.totalTransfers = storedTransfers.length;

    this.logger.info(`Found ${storedTransfers.length} transfers to replay`);

    // Process transfers in batches
    for (let i = 0; i < storedTransfers.length; i += batchSize) {
      const batch = storedTransfers.slice(i, Math.min(i + batchSize, storedTransfers.length));

      // Convert stored transfers to TigerBeetle Transfer format
      const transfers: Transfer[] = batch.map((stored) => ({
        id: bufferToTbId(stored.transferId),
        debit_account_id: bufferToTbId(stored.debitAccountId),
        credit_account_id: bufferToTbId(stored.creditAccountId),
        amount: BigInt(stored.amount),
        pending_id: stored.pendingId ? bufferToTbId(stored.pendingId) : 0n,
        user_data_128: stored.userData128 ? bufferToTbId(stored.userData128) : 0n,
        user_data_64: stored.userData64 ? BigInt(stored.userData64) : 0n,
        user_data_32: stored.userData32 || 0,
        timeout: stored.timeout ? BigInt(stored.timeout) : 0n,
        ledger: stored.ledger,
        code: stored.code,
        flags: stored.flags,
        timestamp: stored.timestamp ? BigInt(stored.timestamp) : 0n,
      }));

      try {
        const errors = await targetClient.createTransfers(transfers);

        if (errors.length > 0) {
          // Log errors but continue (some might be duplicates which is okay)
          for (const error of errors) {
            this.logger.warn(
              `Transfer at index ${error.index} in batch ${i / batchSize} failed: ${error.result}`,
            );
            progress.errors.push({
              type: 'transfer',
              index: i + error.index,
              error: `Error code: ${error.result}`,
            });
          }
        }

        progress.transfersReplayed += batch.length - errors.length;
      } catch (error) {
        this.logger.error(`Failed to replay transfer batch ${i / batchSize}`, error);
        throw error;
      }

      // Report progress
      if (onProgress) {
        onProgress(progress);
      }

      this.logger.info(
        `Replayed ${progress.transfersReplayed}/${progress.totalTransfers} transfers`,
      );
    }
  }

  /**
   * Validate that the target cluster has the same state as stored
   */
  async validateMigration(
    targetClusterId: bigint,
    targetReplicaAddresses: string[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    this.logger.info('Starting migration validation...');

    const targetClient = createClient({
      cluster_id: targetClusterId,
      replica_addresses: targetReplicaAddresses,
    });

    const errors: string[] = [];

    try {
      // Validate accounts
      const storedAccounts = await this.accountRepository.getAllAccountsOrdered();

      for (const stored of storedAccounts) {
        try {
          const accounts = await targetClient.lookupAccounts([bufferToTbId(stored.accountId)]);

          if (accounts.length === 0) {
            errors.push(`Account ${stored.accountId.toString('hex')} not found in target`);
            continue;
          }

          const targetAccount = accounts[0];

          // Validate key fields match
          if (targetAccount.ledger !== stored.ledger) {
            errors.push(`Account ${stored.accountId.toString('hex')} ledger mismatch`);
          }
          if (targetAccount.code !== stored.code) {
            errors.push(`Account ${stored.accountId.toString('hex')} code mismatch`);
          }
        } catch (error) {
          errors.push(`Failed to validate account: ${error.message}`);
        }
      }

      this.logger.info(`Validated ${storedAccounts.length} accounts`);

      // Validate transfers
      const storedTransfers = await this.transferRepository.getAllTransfersOrdered();

      for (const stored of storedTransfers) {
        try {
          const transfers = await targetClient.lookupTransfers([bufferToTbId(stored.transferId)]);

          if (transfers.length === 0) {
            errors.push(`Transfer ${stored.transferId.toString('hex')} not found in target`);
            continue;
          }

          const targetTransfer = transfers[0];

          // Validate key fields match
          if (targetTransfer.amount !== BigInt(stored.amount)) {
            errors.push(`Transfer ${stored.transferId.toString('hex')} amount mismatch`);
          }
          if (targetTransfer.ledger !== stored.ledger) {
            errors.push(`Transfer ${stored.transferId.toString('hex')} ledger mismatch`);
          }
        } catch (error) {
          errors.push(`Failed to validate transfer: ${error.message}`);
        }
      }

      this.logger.info(`Validated ${storedTransfers.length} transfers`);
    } finally {
      targetClient.destroy();
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
