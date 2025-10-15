#!/bin/bash
set -e

echo "Starting Transfa Backend..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until nc -z "${DB_HOST}" "${DB_PORT}" > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up!"

# Run database migrations
echo "Running database migrations..."
ts-node --files -r tsconfig-paths/register scripts/db/migrate.ts

echo "✅ Backend initialization complete!"
echo "Note: Ensure TigerBeetle is running and accessible at ${TIGER_BEETLE_REPLICAS_ADDRESSES}"

# Execute the main command
exec "$@"
