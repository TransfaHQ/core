import { Kysely, sql } from 'kysely';

import { DB } from '@libs/database/types';

const PG_MINIMUM_VERSION = 170004;

export async function checkPostgresVersion(db: Kysely<DB>) {
  const result = await sql<Record<string, any>>`SHOW server_version_num`.execute(db);
  const versionNum = parseInt(result.rows[0].serverVersionNum, 10);

  if (versionNum < PG_MINIMUM_VERSION) {
    throw new Error(
      `🚨 PostgreSQL version ${versionNum} detected. Minimum required is ${PG_MINIMUM_VERSION}`,
    );
  }
}
