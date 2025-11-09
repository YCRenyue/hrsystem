module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Style rules per CLAUDE.md
    'max-len': ['error', { code: 100, ignoreStrings: true, ignoreTemplateLiterals: true }],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'indent': ['error', 2],

    // Function and file size limits per CLAUDE.md
    'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],

    // Common sense adjustments for Node.js backend
    'no-console': 'off', // We use console for logging
    'consistent-return': 'warn', // Warning instead of error
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'func-names': 'off', // Allow anonymous functions
    'no-underscore-dangle': 'off', // Allow _ prefix for private methods

    // Async/await
    'no-await-in-loop': 'warn', // Warning instead of error for DB operations
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message: 'for..in loops iterate over the entire prototype chain. Use Object.{keys,values,entries} instead.'
      },
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain.'
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict.'
      }
    ],

    // Import rules
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/*.spec.js'] }],
    'import/prefer-default-export': 'off',

    // JSDoc
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off'
  }
};
