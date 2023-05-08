module.exports = {
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module', // Allows for the use of imports
  },
  env: {
    browser: true,
    es2022: true,
    mocha: true,
    node: true,
  },
  globals: {
    globalThis: false, // means it's not writable
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': [
      'error',
      'single',
      { 'allowTemplateLiterals': true },
    ],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'no-unused-vars': [
      'error',
      {
        'vars': 'all',
        'args': 'after-used',
        'ignoreRestSiblings': true,
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
      },
    ],
  },
};