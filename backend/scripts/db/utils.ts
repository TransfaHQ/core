import { execSync } from 'child_process';
import { ConnectionStringParser, Logger, generate, getDialect } from 'kysely-codegen';

import { dbConfig } from '@src/database/config.schema';

export async function generateKyselyTypes() {
  const parser = new ConnectionStringParser();
  const logger = new Logger();
  const { connectionString, dialect: dialectName } = parser.parse({
    connectionString: `postgres://${dbConfig.DB_USERNAME}:${dbConfig.DB_PASSWORD}@${dbConfig.DB_HOST}:${dbConfig.DB_PORT}/${dbConfig.DB_NAME}`,
  });

  const dialect = getDialect(dialectName, {});
  const db = await dialect.introspector.connect({
    connectionString,
    dialect,
  });

  await generate({
    db,
    defaultSchemas: [dbConfig.CORE_POSTGRES_SCHEMA],
    logger,
    dialect,
    outFile: './src/libs/database/types.ts',
    camelCase: true,
    excludePattern: `**.${dbConfig.DB_MIGRATIONS_TABLE}`,
    runtimeEnums: false,
  });

  console.log('Running lint --fix on generated types...');
  try {
    execSync('pnpm lint --fix', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Lint --fix completed');
  } catch {
    console.warn('⚠️  Lint --fix encountered issues, but continuing...');
  }
}
