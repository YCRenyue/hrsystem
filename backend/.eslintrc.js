module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Style rules per CLAUDE.md
    'max-len': ['warn', {
      code: 120, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true
    }],
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    indent: ['error', 2],

    // Function and file size limits - relaxed for complex business logic
    'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
    'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
    'max-classes-per-file': ['warn', 10], // Allow multiple error classes in one file

    // Common sense adjustments for Node.js backend
    'no-console': 'off', // We use console for logging
    'consistent-return': 'warn', // Warning instead of error
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'func-names': 'off', // Allow anonymous functions
    'no-underscore-dangle': 'off', // Allow _ prefix for private methods
    camelcase: 'off', // Allow snake_case for DB fields
    'class-methods-use-this': 'off', // Allow class methods without this
    'global-require': 'off', // Allow require() anywhere
    radix: ['error', 'always'], // Enforce radix for parseInt
    'no-plusplus': 'off', // Allow ++ operator
    'no-param-reassign': ['error', { props: false }], // Allow modifying properties of parameters
    'no-return-await': 'off', // Allow await in return
    'no-continue': 'off', // Allow continue statements
    'no-use-before-define': ['error', { functions: false }], // Allow function hoisting
    'import/no-dynamic-require': 'off', // Allow dynamic requires for migrations
    'no-restricted-globals': ['error', 'event', 'fdescribe'], // Remove isNaN from restricted globals
    'no-shadow': ['warn', { allow: ['err', 'error', 'resolve', 'reject', 'startDate', 'endDate'] }],
    'no-prototype-builtins': 'warn', // Allow hasOwnProperty in some cases

    // Async/await
    'no-await-in-loop': 'warn', // Warning instead of error for DB operations
    'no-restricted-syntax': [
      'warn',
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
    'import/no-extraneous-dependencies': ['warn', { devDependencies: ['**/*.test.js', '**/*.spec.js', '**/db/**/*.js', '**/seeds/**/*.js'] }],
    'import/prefer-default-export': 'off',

    // JSDoc
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off'
  }
};
