/* eslint-env node */
module.exports = {
  root: true,
  extends: ['wdzeng', 'wdzeng/typescript', 'plugin:prettier/recommended'],
  env: {
    browser: false,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module'
  },
  rules: {
    // Your custom rules go here ...
    'prettier/prettier': 'warn'
  }
}
