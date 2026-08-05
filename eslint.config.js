import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * This config existed for a long time and had never once been run — eslint was
 * not installed and there was no `lint` script. The first run found a live bug:
 * `cloudSync.js` called `appUrl()` without importing it, so requesting a
 * password reset threw `ReferenceError`. Nothing else in the toolchain could
 * see it. Vite does not resolve free identifiers at build time, and no test
 * exercises that path.
 *
 * That is the same shape as the crash that shipped into the Touchpoints screen
 * (`projectPalette is not defined`) and survived a clean build plus 905 passing
 * unit tests, because nothing renders these views. `no-undef` is the rule that
 * catches both, and it is the reason this file now has an entry point.
 *
 * Environments are declared per file group below. Without them `no-undef`
 * reports `process` and `Buffer` in Node files as errors, and a rule that
 * mostly cries wolf gets muted — which is how it ends up unrun again.
 */
export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),

  /* App source: browser globals, plus the three constants Vite injects via
     `define`. They are real at runtime and invisible to static analysis. */
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
        __APP_BUILD__: 'readonly',
        __APP_BUILD_DATE__: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },

  /* Tests run in Node under vitest and legitimately touch process/Buffer. */
  {
    files: ['**/*.test.{js,jsx}', 'e2e/**/*.js', 'scripts/**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  /* Build config, server and serverless handlers are Node, not browser. */
  {
    files: [
      '*.config.js',
      'server/**/*.js',
      'api/**/*.js',
      'functions/**/*.js',
    ],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
