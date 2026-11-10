import tseslint from 'typescript-eslint';

export default [
  { ignores: ['.output/**', '.wxt/**'] },
  ...tseslint.configs.recommended,
];
