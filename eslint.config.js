import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import dokoon from './scripts/eslint-app-boundaries.mjs';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-panel',
      'dev-dist',
      'storybook-static',
      'android',
      'prototype',
      'public/mockServiceWorker.js',
      'src/api/schema.d.ts',
      'test-results',
      'playwright-report',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, dokoon },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      // Customer app ↔ restaurant panel import boundary (D-91).
      'dokoon/app-boundaries': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Design rule: no hard-coded colors in components (tokens only). Inline style hex is flagged.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='style'] Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: 'Use design tokens (var(--…)) instead of hard-coded colors.',
        },
      ],
    },
  },
  {
    // Story render functions use hooks for interactive demos.
    files: ['**/*.stories.tsx'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
);
