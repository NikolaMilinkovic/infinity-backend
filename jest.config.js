/**
 * Tests configuration
 */

module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '__tests__/jest/testApp.js', '__tests__/jest/globalMocks.js'],
  setupFiles: ['<rootDir>/__tests__/jest/globalMocks.js'],
};
