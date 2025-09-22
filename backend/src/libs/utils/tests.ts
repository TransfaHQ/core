export const setTestBasicAuthHeader = () => {
  const credentials = `${__TEST_CORE_API_KEY__}:${__TEST_CORE_API_SECRET__}`;
  const base64Credentials = Buffer.from(credentials, 'utf-8').toString('base64');
  return {
    Authorization: `Basic ${base64Credentials}`,
  };
};
