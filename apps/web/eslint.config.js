const { defineConfig } = require('eslint/config');
const shared = require('@nexa/config/eslint');

module.exports = defineConfig([
  shared,
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
]);
