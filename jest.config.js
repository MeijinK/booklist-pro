// https://docs.expo.dev/develop/unit-testing/
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/', '/.expo/'],
  collectCoverageFrom: [
    'domain/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'features/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'theme/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
