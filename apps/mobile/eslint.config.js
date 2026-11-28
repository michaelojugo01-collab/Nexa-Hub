const { defineConfig } = require('eslint/config');
const shared = require('@nexa/config/eslint');

module.exports = defineConfig([
  shared,
  {
    // jest.mock factories must use require(), so allow it in tests only.
    files: ['**/__tests__/**', 'src/app-tests/**', 'src/test/**', 'jest.setup.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
