/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
  root          : true,
  extends       : ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser        : '@typescript-eslint/parser',
  parserOptions : {
    ecmaVersion : 2022,
    sourceType  : 'module'
  },
  plugins : ['@typescript-eslint', 'mocha'],
  env     : {
    node    : true,
    es2022  : true,
    browser : true
  },
  'ignorePatterns': [
    'dist',
    '__tests__'
  ],
  rules: {
    'key-spacing': [
      'error',
      {
        'align': {
          'afterColon'  : true,
          'beforeColon' : true,
          'on'          : 'colon'
        }
      }
    ],
    'quotes': [
      'error',
      'single',
      { 'allowTemplateLiterals': true }
    ],
    'semi'                              : ['error', 'always'],
    'indent'                            : ['error', 2, { 'SwitchCase': 1 }],
    'no-unused-vars'                    : 'off',
    'prefer-const'                      : 'off',
    '@typescript-eslint/no-unused-vars' : [
      'error',
      {
        'vars'               : 'all',
        'args'               : 'after-used',
        'ignoreRestSiblings' : true,
        'argsIgnorePattern'  : '^_',
        'varsIgnorePattern'  : '^_'
      }
    ],
    '@typescript-eslint/no-explicit-any'       : 'off',
    'no-trailing-spaces'                       : ['error'],
    '@typescript-eslint/no-non-null-assertion' : 'off',
    '@typescript-eslint/ban-ts-comment'        : 'off',
    'mocha/no-exclusive-tests'                 : 'warn'
  }
};