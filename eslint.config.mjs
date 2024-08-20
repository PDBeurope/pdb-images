import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import stylisticEslint from '@stylistic/eslint-plugin';


export default tsEslint.config(
    eslint.configs.recommended,
    ...tsEslint.configs.recommended,
    ...tsEslint.configs.stylistic,
    {
      plugins: {
          '@stylistic': stylisticEslint,
      },
      rules:{
        'prefer-const': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/consistent-indexed-object-style': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',

        '@stylistic/indent': ['error', 4],
        '@stylistic/quotes': ['error', 'single', {
          avoidEscape: true,
          allowTemplateLiterals: true,
        }],
        '@stylistic/semi': 'off',
        '@stylistic/type-annotation-spacing': 'error',
        '@stylistic/brace-style': ['error', '1tbs', {
            allowSingleLine: true,
        }],
        '@stylistic/comma-spacing': 'error',
        '@stylistic/space-infix-ops': 'error',
        '@stylistic/space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always',
        }],
        '@stylistic/func-call-spacing': ['error'],
        '@stylistic/keyword-spacing': ['error'],
      },
    },
  );
