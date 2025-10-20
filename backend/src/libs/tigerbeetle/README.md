# TigerBeetle Transfer Storage & Cluster Migration

This feature enables storing all TigerBeetle operations (Accounts and Transfers) in PostgreSQL for:
- **Cluster Migration**: Migrate from one TigerBeetle cluster to another
- **Dual Write**: Write to multiple TigerBeetle clusters simultaneously for zero-downtime migration
- **Audit Trail**: Complete history of all TigerBeetle operations

## Features

### 1. Operation Storage
All TigerBeetle operations are automatically stored in two tables:
- `tigerbeetle_accounts` - Complete Account creation records
- `tigerbeetle_transfers` - Complete Transfer records

These tables store the full TigerBeetle object data, allowing perfect replay to a new cluster.

### 2. Dual Write
When enabled, the system writes to both a primary and secondary TigerBeetle cluster synchronously. Both operations must succeed for the transaction to commit.

### 3. Cluster Migration
A migration script replays all stored operations to a new cluster in chronological order, with validation.

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Primary cluster (existing)
TIGER_BEETLE_CLUSTER_ID=0
TIGER_BEETLE_REPLICAS_ADDRESSES=127.0.0.1:3001,127.0.0.1:3002,127.0.0.1:3003

# Secondary cluster (optional - for dual write)
TIGER_BEETLE_SECONDARY_CLUSTER_ID=1
TIGER_BEETLE_SECONDARY_REPLICAS_ADDRESSES=127.0.0.1:4001,127.0.0.1:4002,127.0.0.1:4003

# Enable dual-write (default: false)
TIGER_BEETLE_DUAL_WRITE_ENABLED=true
```

## Usage

### Setup

1. **Run Database Migration**
   ```bash
   pnpm run db:migrate
   ```

2. **Regenerate Types** (optional, for TypeScript types)
   ```bash
   pnpm run db:generate
   ```

### Enabling Dual Write

To prepare for a cluster migration:

1. Set up the new TigerBeetle cluster
2. Add secondary cluster config to `.env`:
   ```bash
   TIGER_BEETLE_SECONDARY_CLUSTER_ID=1
   TIGER_BEETLE_SECONDARY_REPLICAS_ADDRESSES=127.0.0.1:4001,127.0.0.1:4002,127.0.0.1:4003
   TIGER_BEETLE_DUAL_WRITE_ENABLED=true
   ```
3. Restart the application
4. All new operations will write to both clusters

### Migrating to a New Cluster

#### Option 1: Using Dual Write (Recommended for Zero-Downtime)

1. **Enable dual write** with secondary cluster config (see above)
2. **Run historical migration** to catch up the secondary cluster:
   ```bash
   pnpm run tb:migrate <CLUSTER_ID> <REPLICA_ADDRESSES>
   ```
   Example:
   ```bash
   pnpm run tb:migrate 1 4001,4002,4003
   ```
3. **Verify migration** - The script automatically validates
4. **Switch over**: Update config to use secondary as primary:
   ```bash
   TIGER_BEETLE_CLUSTER_ID=1
   TIGER_BEETLE_REPLICAS_ADDRESSES=127.0.0.1:4001,127.0.0.1:4002,127.0.0.1:4003
   TIGER_BEETLE_DUAL_WRITE_ENABLED=false  # Disable dual write
   ```
5. **Restart** the application

#### Option 2: Offline Migration

1. **Stop the application** (downtime begins)
2. **Run migration script**:
   ```bash
   pnpm run tb:migrate <NEW_CLUSTER_ID> <NEW_REPLICA_ADDRESSES>
   ```
3. **Update config** to point to new cluster
4. **Restart application** (downtime ends)

### Migration Script Options

```bash
# Basic usage
pnpm run tb:migrate <CLUSTER_ID> <REPLICA_ADDRESSES> [BATCH_SIZE]

# Examples
pnpm run tb:migrate 1 4001,4002,4003                    # Default batch size (100)
pnpm run tb:migrate 1 4001,4002,4003 50                 # Custom batch size
pnpm run tb:migrate 1 192.168.1.10:3001,192.168.1.11:3001  # Remote addresses
```

The script will:
1. Replay all accounts (in creation order)
2. Replay all transfers (in creation order)
3. Validate the migration
4. Report progress and errors

## Architecture

### TigerBeetleService Enhancement

The `TigerBeetleService` has been enhanced to:
- Initialize secondary client when dual-write is enabled
- Write to both clusters on `createAccounts()` and `createTransfers()`
- Store operations in PostgreSQL tables
- Throw errors if any operation fails (ensuring consistency)

### Repositories

Two repositories handle database operations:
- `TigerbeetleAccountRepository` - CRUD for stored accounts
- `TigerbeetleTransferRepository` - CRUD for stored transfers

### Migration Service

`TigerBeetleMigrationService` provides:
- `migrateToCluster()` - Replay all operations to target cluster
- `validateMigration()` - Verify target cluster matches stored data
- Progress tracking and error reporting

## Database Schema

### tigerbeetle_accounts
```sql
CREATE TABLE tigerbeetle_accounts (
  id uuid PRIMARY KEY,
  account_id bytea UNIQUE NOT NULL,
  debits_pending bigint NOT NULL,
  debits_posted bigint NOT NULL,
  credits_pending bigint NOT NULL,
  credits_posted bigint NOT NULL,
  user_data_128 bytea,
  user_data_64 bigint,
  user_data_32 integer,
  ledger integer NOT NULL,
  code smallint NOT NULL,
  flags integer NOT NULL,
  timestamp bigint,
  ledger_account_id uuid,  -- FK to ledger_accounts
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

### tigerbeetle_transfers
```sql
CREATE TABLE tigerbeetle_transfers (
  id uuid PRIMARY KEY,
  transfer_id bytea UNIQUE NOT NULL,
  debit_account_id bytea NOT NULL,
  credit_account_id bytea NOT NULL,
  amount bigint NOT NULL,
  pending_id bytea,
  user_data_128 bytea,
  user_data_64 bigint,
  user_data_32 integer,
  timeout bigint,
  ledger integer NOT NULL,
  code smallint NOT NULL,
  flags integer NOT NULL,
  timestamp bigint,
  ledger_entry_id uuid,  -- FK to ledger_entries
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

## Performance Considerations

- **Storage Overhead**: Each operation is stored in PostgreSQL, increasing database size
- **Write Latency**: Dual-write adds latency (2x TigerBeetle operations + 1 DB write)
- **Migration Time**: Depends on data volume and batch size
- **Batch Size**: Adjust based on network latency and operation complexity

## Error Handling

### Dual Write Failures
If either cluster fails during dual-write:
- The entire operation fails
- Database transaction rolls back
- Error is thrown to caller
- No partial state is committed

### Migration Errors
The migration script:
- Logs all errors but continues
- Reports errors at the end
- Some errors are expected (e.g., duplicate account creation)
- Validation step catches inconsistencies

## Monitoring

Monitor dual-write operations:
```typescript
// Logs include:
- "Initializing secondary TigerBeetle client for dual-write"
- "Failed to create account on secondary cluster: ..."
- "Failed to create N transfers on secondary cluster"
```

Monitor migrations:
```bash
# Script outputs:
- Progress: Accounts X/Y (%), Transfers X/Y (%)
- ✅ Migration completed successfully!
- Accounts replayed: X/Y
- Transfers replayed: X/Y
- Errors encountered: N
```

## Testing

### Manual Testing

1. **Test Dual Write**:
   ```bash
   # Start two TigerBeetle clusters
   # Enable dual-write in config
   # Create accounts/transfers via API
   # Verify both clusters have the data
   ```

2. **Test Migration**:
   ```bash
   # Create data in primary cluster
   # Run migration to secondary
   # Verify secondary has all data
   ```

## Limitations

- **Future Operations Only**: Only stores operations from the point the feature is enabled
- **No Historical Backfill**: Cannot automatically backfill pre-existing TigerBeetle data
- **Synchronous Dual Write**: Adds latency (consider async options for high-throughput scenarios)
- **Cluster ID Format**: Migration script has simple cluster ID conversion (adjust as needed)

## Troubleshooting

### "Failed to create account on secondary cluster"
- Check secondary cluster is running and accessible
- Verify replica addresses are correct
- Check network connectivity

### Migration errors during replay
- Some errors are normal (e.g., duplicate accounts if migration was run multiple times)
- Check validation output to see if migration is consistent
- Review error logs for specific issues

### Dual-write performance impact
- Consider increasing TigerBeetle client pool size
- Optimize network latency between clusters
- Consider async dual-write for non-critical operations

## Future Enhancements

Potential improvements:
- Async dual-write option for better performance
- Selective operation storage (e.g., only certain account types)
- Historical data backfill from existing TigerBeetle cluster
- CDC-based replication instead of dual-write
- Multi-region cluster support
