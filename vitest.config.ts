import { configDefaults, defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Agent worktrees are full checkouts of other branches, and .animation-audit holds sandbox
    // audit scratch files; never collect tests from either.
    // e2e/*.spec.ts are the Playwright browser suites (npm run e2e); pure helpers in e2e/support/
    // keep their unit tests (*.test.ts) here.
    // The level-4 suites (test/integration/**/*.integration.test.ts) are collected by the default
    // include like every other *.test.ts; their support code lives in test/integration/support/.
    exclude: [...configDefaults.exclude, '.claude/worktrees/**', '.animation-audit/**', 'e2e/**/*.spec.ts'],
    // `npm run test:coverage`: what levels 1 to 4 reach in the app, the worker and shared code.
    // CI prints the summary on the run page; it is a map, not a gate.
    coverage: {
      provider: 'v8',
      include: ['shared/**', 'party/**', 'src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*-test-*.ts', '**/*.fixtures.ts', '**/test-support/**', '**/*.types.ts'],
      reporter: ['text-summary', 'json-summary'],
      reportOnFailure: true,
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  root: rootDir,
});
