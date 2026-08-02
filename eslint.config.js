'use strict';

const noOutwardImports = require('./tools/eslint-rules/no-outward-imports');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['domain/**/*.js', 'application/**/*.js', 'infrastructure/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      // Local, unpublished plugin: rules that only make sense for this
      // repo's layer boundaries live in tools/eslint-rules/.
      local: {
        rules: {
          'no-outward-imports': noOutwardImports,
        },
      },
    },
    rules: {
      'local/no-outward-imports': 'error',
    },
  },
];
