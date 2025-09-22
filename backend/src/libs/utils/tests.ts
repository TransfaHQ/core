export const setTestBasicAuthHeader = (key: string, secret: string) => {
  const credentials = `${key}:${secret}`;
  const base64Credentials = Buffer.from(credentials, 'utf-8').toString('base64');
  return {
    Authorization: `Basic ${base64Credentials}`,
  };
};
