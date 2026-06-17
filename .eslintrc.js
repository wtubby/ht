module.exports = {
  extends: [require.resolve('@umijs/lint/dist/config/eslint')],
  globals: {
    page: true,
    REACT_APP_ENV: true,
  },
  rules: {
    eqeqeq: ['warn', 'always', { null: 'ignore' }],
    'no-console': 'warn',
  },
};
