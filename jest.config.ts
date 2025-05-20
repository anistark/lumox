import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  setupFilesAfterEnv: ['./tests/setup.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  // Add this to enable Jest globals in ESM
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
};

export default config;
