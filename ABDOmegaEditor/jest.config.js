// @ts-check

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Use node environment since most tests are backend/service logic
  testEnvironment: 'node',

  // Match both .test.ts and .spec.ts files
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],

  // Exclude E2E tests (Playwright), node_modules, and legacy code
  testPathIgnorePatterns: ['/node_modules/', '/legacy/', '/e2e/'],

  // Verbose output for debugging
  verbose: true,
};

module.exports = createJestConfig(customJestConfig);
