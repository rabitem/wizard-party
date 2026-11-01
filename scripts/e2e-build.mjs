#!/usr/bin/env node
/**
 * Production build with the animation sandbox route enabled, for the Playwright suites
 * (npm run e2e). NEXT_PUBLIC_* values are inlined at build time, so they must be set here.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX: '1' },
});
process.exit(result.status ?? 1);
