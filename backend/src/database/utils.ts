import { DataSource } from 'typeorm';

const PG_MINIMUM_VERSION = 170004;

export async function checkPostgresVersion(dataSource: DataSource) {
  const result =
    await dataSource.query<{ server_version_num: string }[]>('SHOW server_version_num');
  const versionNum = parseInt(result[0].server_version_num, 10);

  if (versionNum < PG_MINIMUM_VERSION) {
    throw new Error(
      `🚨 PostgreSQL version ${versionNum} detected. Minimum required is ${PG_MINIMUM_VERSION}`,
    );
  }
}
