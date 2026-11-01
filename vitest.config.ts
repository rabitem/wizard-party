import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Agent worktrees are full checkouts of other branches, and .animation-audit holds sandbox
    // audit scratch files; never collect tests from either.
    // e2e/ holds the Playwright browser suites (npm run e2e).
    // The level-4 suites (test/integration/**/*.integration.test.ts) are collected by the default
    // include like every other *.test.ts; their support code lives in test/integration/support/.
    exclude: [...configDefaults.exclude, '.claude/worktrees/**', '.animation-audit/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  root: rootDir,
});
