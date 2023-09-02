/* eslint-env node */
module.exports = {
  root: true,
  extends: ['wdzeng/typescript'],
  env: {
    browser: false,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  rules: {
    'prettier/prettier': 'warn'
  },
  overrides: [
    {
      files: ['src/cli/index.ts'],
      rules: {
        'unicorn/no-process-exit': 'off',
      }
    }
  ]
}
