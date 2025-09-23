module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        transpilation: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@libs/(.*)$': '<rootDir>/src/libs/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 30000,
  setupFilesAfterEnv: [],
  globalTeardown: '<rootDir>/src/jest-e2e-global-teardown.ts',
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)/', // transform uuid even though it's in node_modules
  ],
};
