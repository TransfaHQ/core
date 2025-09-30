module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
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
  globalTeardown: '<rootDir>/src/test/jest-e2e-global-teardown.ts',
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
  verbose: true,
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/main.ts',
    '!src/repl.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
