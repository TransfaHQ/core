#!/usr/bin/env ts-node
/**
 * TigerBeetle Cluster Migration Script
 *
 * This script replays all stored TigerBeetle operations (accounts and transfers)
 * to a new cluster, enabling migration between clusters.
 *
 * Usage:
 *   ts-node scripts/tigerbeetle/migrate.ts <TARGET_CLUSTER_ID> <TARGET_REPLICA_ADDRESSES>
 *
 * Example:
 *   ts-node scripts/tigerbeetle/migrate.ts 0_0_transfa_new 3001,3002,3003
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '@src/app.module';
import { TigerBeetleMigrationService } from '@libs/tigerbeetle/tigerbeetle-migration.service';

async function migrate() {
  const logger = new Logger('TigerBeetleMigration');

  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    logger.error('Usage: ts-node migrate.ts <TARGET_CLUSTER_ID> <TARGET_REPLICA_ADDRESSES>');
    logger.error('Example: ts-node migrate.ts 0_0_transfa_new 3001,3002,3003');
    process.exit(1);
  }

  const targetClusterIdStr = args[0];
  const targetReplicaAddressesStr = args[1];
  const batchSize = args[2] ? parseInt(args[2], 10) : 100;

  // Parse cluster ID (handle different formats)
  let targetClusterId: bigint;
  try {
    // If it's a numeric string, use it directly
    if (/^\d+$/.test(targetClusterIdStr)) {
      targetClusterId = BigInt(targetClusterIdStr);
    } else {
      // If it's a format like "0_0_transfa_dev", convert it
      // This is a simple conversion - adjust based on your cluster ID format
      const hash = Buffer.from(targetClusterIdStr, 'utf-8')
        .reduce((acc, byte) => acc + byte, 0);
      targetClusterId = BigInt(hash);
      logger.log(`Converted cluster ID "${targetClusterIdStr}" to ${targetClusterId}`);
    }
  } catch (error) {
    logger.error(`Invalid cluster ID format: ${targetClusterIdStr}`);
    process.exit(1);
  }

  const targetReplicaAddresses = targetReplicaAddressesStr.split(',').map((addr) => {
    // If just a port number, prepend localhost
    if (/^\d+$/.test(addr.trim())) {
      return `127.0.0.1:${addr.trim()}`;
    }
    return addr.trim();
  });

  logger.log('='.repeat(60));
  logger.log('TigerBeetle Cluster Migration');
  logger.log('='.repeat(60));
  logger.log(`Target Cluster ID: ${targetClusterId}`);
  logger.log(`Target Replicas: ${targetReplicaAddresses.join(', ')}`);
  logger.log(`Batch Size: ${batchSize}`);
  logger.log('='.repeat(60));

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // Get migration service
    const migrationService = app.get(TigerBeetleMigrationService);

    // Confirm before proceeding
    logger.warn('⚠️  WARNING: This will replay all operations to the target cluster.');
    logger.warn('⚠️  Make sure the target cluster is empty or you understand the implications.');
    logger.log('');
    logger.log('Starting migration in 5 seconds... (Press Ctrl+C to cancel)');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Run migration with progress tracking
    const startTime = Date.now();
    const progress = await migrationService.migrateToCluster({
      targetClusterId,
      targetReplicaAddresses,
      batchSize,
      onProgress: (p) => {
        const accountPct = (p.accountsReplayed / p.totalAccounts) * 100 || 0;
        const transferPct = (p.transfersReplayed / p.totalTransfers) * 100 || 0;
        logger.log(
          `Progress: Accounts ${p.accountsReplayed}/${p.totalAccounts} (${accountPct.toFixed(1)}%), ` +
          `Transfers ${p.transfersReplayed}/${p.totalTransfers} (${transferPct.toFixed(1)}%)`,
        );
      },
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.log('='.repeat(60));
    logger.log('✅ Migration completed successfully!');
    logger.log('='.repeat(60));
    logger.log(`Accounts replayed: ${progress.accountsReplayed}/${progress.totalAccounts}`);
    logger.log(`Transfers replayed: ${progress.transfersReplayed}/${progress.totalTransfers}`);
    logger.log(`Errors encountered: ${progress.errors.length}`);
    logger.log(`Duration: ${duration} seconds`);

    if (progress.errors.length > 0) {
      logger.warn('');
      logger.warn('Errors occurred during migration:');
      progress.errors.slice(0, 10).forEach((err) => {
        logger.warn(`  [${err.type}] Index ${err.index}: ${err.error}`);
      });
      if (progress.errors.length > 10) {
        logger.warn(`  ... and ${progress.errors.length - 10} more errors`);
      }
    }

    // Optionally validate the migration
    logger.log('');
    logger.log('Running validation...');
    const validation = await migrationService.validateMigration(
      targetClusterId,
      targetReplicaAddresses,
    );

    if (validation.valid) {
      logger.log('✅ Validation passed! Migration is consistent.');
    } else {
      logger.error('❌ Validation failed! Some inconsistencies detected:');
      validation.errors.slice(0, 10).forEach((err) => {
        logger.error(`  ${err}`);
      });
      if (validation.errors.length > 10) {
        logger.error(`  ... and ${validation.errors.length - 10} more errors`);
      }
    }

    logger.log('='.repeat(60));
  } catch (error) {
    logger.error('❌ Migration failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run the migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
