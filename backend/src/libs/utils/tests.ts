import { uuidV7 } from '@libs/utils/uuid';

export const setTestBasicAuthHeader = (key: string, secret: string, idempotency?: string) => {
  const credentials = `${key}:${secret}`;
  const base64Credentials = Buffer.from(credentials, 'utf-8').toString('base64');
  return {
    Authorization: `Basic ${base64Credentials}`,
    'idempotency-key': idempotency ?? uuidV7(),
  };
};
