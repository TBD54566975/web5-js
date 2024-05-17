const baseConfig = require('../../eslint.config.cjs');

/** @type {import('eslint').ESLint.ConfigData} */
module.exports = [
  ...baseConfig,
  {
  rules: {
    '@typescript-eslint/no-namespace': 'off',
  }
}];