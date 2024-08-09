const eslint = require("@eslint/js");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const mochaPlugin = require("eslint-plugin-mocha");

/** @type {import('eslint').ESLint.ConfigData} */
module.exports = [
  eslint.configs.recommended,
  mochaPlugin.configs.flat.recommended,
  // tsPlugin.configs.flat.recommended, // @typescript-eslint v7.9.0 doesn't have a recommended config yet, v8 alpha build has it, so should be available soon.
  {
    // extends       : ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { modules: true },
        ecmaVersion: "2022",
        project: [
          "tests/tsconfig.json", // this is the config that includes both `src` and `tests` directories
        ],
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.browser,
        console: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      mocha: mochaPlugin,
    },
    files: ["**/*.ts"],
    // IMPORTANT and confusing: `ignores` only exclude files from the `files` setting.
    // To exclude *.js files entirely, you need to have a separate config object altogether. (See another `ignores` below.)
    ignores: ["**/*.d.ts"],
    rules: {
      "no-undef": "off",
      "no-redeclare": "off",
      "key-spacing": [
        "error",
        {
          align: {
            afterColon: true,
            beforeColon: true,
            on: "colon",
          },
        },
      ],
      quotes: ["error", "single", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
      indent: ["error", 2, { SwitchCase: 1 }],
      "no-unused-vars": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-dupe-class-members": "off",
      "no-trailing-spaces": ["error"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // TODO: Revisit new default mocha rules that were disabled in #579 - https://github.com/TBD54566975/web5-js/issues/580
      "mocha/no-exclusive-tests": "warn",
      "mocha/no-setup-in-describe": "off",
      "mocha/no-mocha-arrows": "off",
      "mocha/max-top-level-suites": "off",
      "mocha/no-identical-title": "off",
      "mocha/no-pending-tests": "off",
      "mocha/no-skipped-tests": "off",
      "mocha/no-sibling-hooks": "off",
    },
  },
  {
    ignores: ["**/*.js", "**/*.cjs", "**/*.mjs"],
  },
];
