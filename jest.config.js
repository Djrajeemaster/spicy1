module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'components/**/*.{js,ts,tsx}',
    'services/**/*.{js,ts}',
    'utils/**/*.{js,ts}',
    'hooks/**/*.{js,ts}',
    'contexts/**/*.{js,ts,tsx}',
    'server.js',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!coverage/**',
    '!tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(expo|@expo|@babel|react-native|@react-native|@testing-library)/)'
  ]
};
