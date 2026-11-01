import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Cross-browser game tests. They drive the animation sandbox (/sandbox/animations) through its
 * agent API, so every test plays the real client against the in-browser loopback server. The one
 * exception is the golden path (project golden-path): the real app against the local game worker.
 *
 *   npm run e2e:build          production build with the sandbox enabled (once per change)
 *   npm run e2e                every suite on every browser and device
 *   npm run e2e -- --project=webkit e2e/reconnect.spec.ts
 *   npm run e2e:perf           frame-time budgets (real clock) on the desktop engines
 *   npx playwright test --project=viewport-matrix   the playability matrix (E2E_FULL_MATRIX=1: all viewports)
 *   npx playwright test e2e/visual.spec.ts --update-snapshots   regenerate visual baselines (CI only, see e2e.yml)
 *   npx playwright test --project=golden-path   the real app end to end; needs `npm run build` and
 *                                               the worker (`npm run dev:party`) on localhost:1999
 *
 * E2E_BASE_URL points the suite at an already running server instead of starting one.
 */

const PORT = Number(process.env.E2E_PORT ?? 3210);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * Lift the vsync cap so frame-time measurements show what the engine can do (the 120 fps target).
 * On Windows the headless Chromium build falls back to SwiftShader (software) unless ANGLE is told
 * to use Direct3D 11, which makes runs many times slower and the numbers meaningless.
 */
const UNCAPPED_CHROMIUM_ARGS = [
  '--disable-gpu-vsync', '--disable-frame-rate-limit', '--ignore-gpu-blocklist',
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
];
const UNCAPPED_FIREFOX_PREFS = { 'layout.frame_rate': 0, 'webgl.force-enabled': true };

/** The viewport matrix sets its own viewports; it runs once, in its own project. */
const MATRIX_SPEC = '**/playability-matrix.spec.ts';
/** The golden path plays the real pages against the local worker, not the sandbox; Chromium only. */
const GOLDEN_PATH_SPEC = '**/golden-path.spec.ts';
/** What every sandbox project leaves to its own project. */
const OWN_PROJECT_SPECS = [MATRIX_SPEC, GOLDEN_PATH_SPEC];

const desktopProjects: PlaywrightTestConfig['projects'] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: UNCAPPED_CHROMIUM_ARGS } }, testIgnore: OWN_PROJECT_SPECS },
  { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { firefoxUserPrefs: UNCAPPED_FIREFOX_PREFS } }, testIgnore: OWN_PROJECT_SPECS },
  // WebKit (the Safari engine) has no frame-rate override; its frame rates are capped at the display rate.
  // On Windows, Playwright's WebKit lacks Web Audio and often GPU WebGL: treat it as a smoke run there.
  { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: OWN_PROJECT_SPECS },
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', launchOptions: { args: UNCAPPED_CHROMIUM_ARGS } }, testIgnore: OWN_PROJECT_SPECS },
];

// Devices check layout and touch play; frame budgets are measured on the desktop engines.
const DEVICE_SUITES_IGNORED = ['**/performance.spec.ts', '**/render-budget.spec.ts', ...OWN_PROJECT_SPECS];
const deviceProjects: PlaywrightTestConfig['projects'] = [
  // Chromium devices get the desktop GPU flags too; without them Windows falls back to SwiftShader.
  { name: 'android-phone', use: { ...devices['Pixel 7'], launchOptions: { args: UNCAPPED_CHROMIUM_ARGS } }, testIgnore: DEVICE_SUITES_IGNORED },
  { name: 'iphone', use: { ...devices['iPhone 14'] }, testIgnore: DEVICE_SUITES_IGNORED },
  { name: 'iphone-landscape', use: { ...devices['iPhone 14 landscape'] }, testIgnore: DEVICE_SUITES_IGNORED },
  { name: 'ipad', use: { ...devices['iPad Pro 11'] }, testIgnore: DEVICE_SUITES_IGNORED },
];

const matrixProjects: PlaywrightTestConfig['projects'] = [
  { name: 'viewport-matrix', testMatch: MATRIX_SPEC, testIgnore: [GOLDEN_PATH_SPEC], use: { ...devices['Desktop Chrome'], launchOptions: { args: UNCAPPED_CHROMIUM_ARGS } } },
];

// Default GPU flags: the golden path measures no frame times, and an uncapped frame rate would only load the runner.
const goldenPathProjects: PlaywrightTestConfig['projects'] = [
  { name: 'golden-path', testMatch: GOLDEN_PATH_SPEC, use: { ...devices['Desktop Chrome'] } },
];

export default defineConfig({
  testDir: './e2e',
  // One sandbox run drives a whole game client; runs are long and GPU-bound, so parallelism stays low.
  fullyParallel: false,
  workers: Number(process.env.E2E_WORKERS ?? 2),
  timeout: 10 * 60_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  // CI prints each failure as it happens (line): a job that hits its timeout still shows why.
  reporter: [[process.env.CI ? 'line' : 'list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Visual baselines live next to the spec, one per project (engine and viewport) and platform.
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',
  projects: [...desktopProjects, ...deviceProjects, ...matrixProjects, ...goldenPathProjects],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
      command: `node node_modules/next/dist/bin/next start -p ${PORT}`,
      // The home page exists in every build; the sandbox route only in an e2e:build (the golden
      // path runs on CI's plain `npm run build`). A sandbox suite on a build without the route
      // fails on its first page load and names the fix (e2e/support/sandbox.ts).
      url: `${BASE_URL}/`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX: '1' },
    },
});
