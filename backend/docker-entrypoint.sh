#!/bin/bash
set -e

echo "Starting Transfa Backend..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
until curl -s "postgresql://${DB_HOST}:${DB_PORT}" > /dev/null 2>&1 || \
      nc -z "${DB_HOST}" "${DB_PORT}" > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is up!"

# Run database migrations
echo "Running database migrations..."
node -r tsconfig-paths/register scripts/db/migrate.js || true

echo "Backend initialization complete!"
echo "Note: Ensure TigerBeetle is running and accessible at ${TIGER_BEETLE_REPLICAS_ADDRESSES}"

# Execute the main command
exec "$@"
