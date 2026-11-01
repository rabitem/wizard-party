import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

/**
 * Cross-browser game tests. They drive the animation sandbox (/sandbox/animations) through its
 * agent API, so every test plays the real client against the in-browser loopback server. The one
 * exception is the golden path (projects golden-path*): the real app against the local game worker.
 *
 *   npm run e2e:build          production build with the sandbox enabled (once per change)
 *   npm run e2e                every suite on every browser and device
 *   npm run e2e -- --project=webkit e2e/reconnect.spec.ts
 *   npm run e2e:perf           frame-time budgets (real clock) on the desktop engines
 *   npx playwright test --project=viewport-matrix   the playability matrix (E2E_FULL_MATRIX=1: all viewports)
 *   npx playwright test --project=settings-matrix   themes x styles x play (E2E_FULL_MATRIX=1: every pair)
 *   npx playwright test e2e/visual.spec.ts --update-snapshots   regenerate visual baselines (CI only, see e2e.yml)
 *   npx playwright test --project=golden-path   the real app end to end; needs `npm run build` and
 *                                               the worker (`npm run dev:party`) on localhost:1999
 *
 * E2E_FULL_MATRIX=1 (the weekly run) also widens the per-project suites: every table size for the
 * core scenarios, faults and the golden path.
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
/** Test browsers stay silent: the game's sound code still runs, nothing reaches the speakers. */
const MUTED_CHROMIUM_ARGS = ['--mute-audio'];
const MUTED_FIREFOX_PREFS = { 'media.volume_scale': '0.0' };

/** The viewport matrix sets its own viewports; it runs once per engine, in its own projects. */
const MATRIX_SPEC = '**/playability-matrix.spec.ts';
/** The settings matrix crosses themes and styles with play; it runs in its own projects. */
const SETTINGS_MATRIX_SPEC = '**/settings-matrix.spec.ts';
/** The golden path plays the real pages against the local worker, not the sandbox. */
const GOLDEN_PATH_SPEC = '**/golden-path.spec.ts';
/** What every sandbox project leaves to its own project. */
const OWN_PROJECT_SPECS = [MATRIX_SPEC, SETTINGS_MATRIX_SPEC, GOLDEN_PATH_SPEC];

type Project = NonNullable<PlaywrightTestConfig['projects']>[number];
type ProjectUse = NonNullable<Project['use']>;

/** Engine settings shared by every project of that engine: muted audio, and the GPU and frame-rate flags when `uncapped`. */
function onEngine(use: ProjectUse, uncapped = true): ProjectUse {
  const engine = use.defaultBrowserType ?? 'chromium';
  if (engine === 'chromium') return { ...use, launchOptions: { args: [...MUTED_CHROMIUM_ARGS, ...(uncapped ? UNCAPPED_CHROMIUM_ARGS : [])] } };
  if (engine === 'firefox') return { ...use, launchOptions: { firefoxUserPrefs: { ...MUTED_FIREFOX_PREFS, ...(uncapped ? UNCAPPED_FIREFOX_PREFS : {}) } } };
  // WebKit (the Safari engine) has no frame-rate override; its frame rates are capped at the display rate.
  // On Windows, Playwright's WebKit lacks Web Audio and often GPU WebGL: treat it as a smoke run there.
  return use;
}

const desktopProjects: Project[] = [
  { name: 'chromium', use: onEngine(devices['Desktop Chrome']), testIgnore: OWN_PROJECT_SPECS },
  { name: 'firefox', use: onEngine(devices['Desktop Firefox']), testIgnore: OWN_PROJECT_SPECS },
  { name: 'webkit', use: onEngine(devices['Desktop Safari']), testIgnore: OWN_PROJECT_SPECS },
  // Branded builds: Microsoft Edge and Google Chrome, as players install them.
  { name: 'edge', use: { ...onEngine(devices['Desktop Edge']), channel: 'msedge' }, testIgnore: OWN_PROJECT_SPECS },
  { name: 'chrome', use: { ...onEngine(devices['Desktop Chrome']), channel: 'chrome' }, testIgnore: OWN_PROJECT_SPECS },
];

// Devices check layout and touch play; frame budgets are measured on the desktop engines.
const DEVICE_SUITES_IGNORED = ['**/performance.spec.ts', '**/render-budget.spec.ts', ...OWN_PROJECT_SPECS];
/** Each device runs the device suites; Chromium devices get the desktop GPU flags too (no SwiftShader on Windows). */
const DEVICES: ReadonlyArray<readonly [name: string, use: ProjectUse]> = [
  ['android-phone', devices['Pixel 7']],
  ['android-landscape', devices['Pixel 7 landscape']],
  ['android-tablet', devices['Galaxy Tab S9']],
  ['fold-cover', devices['Galaxy Z Fold 7 Cover']],
  ['fold-open', devices['Galaxy Z Fold 7']],
  ['iphone', devices['iPhone 14']],
  ['iphone-landscape', devices['iPhone 14 landscape']],
  ['iphone-se', devices['iPhone SE (3rd gen)']],
  ['iphone-pro-max', devices['iPhone 15 Pro Max']],
  ['ipad', devices['iPad Pro 11']],
  ['ipad-landscape', devices['iPad Pro 11 landscape']],
  ['ipad-mini', devices['iPad Mini']],
  // Windows displays at 200 % scaling, in both desktop engines that run there.
  ['chromium-hidpi', devices['Desktop Chrome HiDPI']],
  ['firefox-hidpi', devices['Desktop Firefox HiDPI']],
  // A touch-screen laptop: a desktop window with a coarse pointer (PlayerHand fit, synthetic pointers).
  ['touch-laptop', { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 }, hasTouch: true }],
];
const deviceProjects: Project[] = DEVICES.map(([name, use]) => ({ name, use: onEngine(use), testIgnore: DEVICE_SUITES_IGNORED }));

/**
 * Matrix suites, one project per engine (and a touch phone for the settings): the viewport matrix
 * sets its own viewports and input, so it runs on the desktop descriptors.
 */
const MATRIX_ENGINES: ReadonlyArray<readonly [suffix: string, use: ProjectUse]> = [
  ['', devices['Desktop Chrome']],
  ['-firefox', devices['Desktop Firefox']],
  ['-webkit', devices['Desktop Safari']],
];
const matrixProjects: Project[] = [
  ...MATRIX_ENGINES.map(([suffix, use]): Project => ({ name: `viewport-matrix${suffix}`, testMatch: MATRIX_SPEC, use: onEngine(use) })),
  ...MATRIX_ENGINES.map(([suffix, use]): Project => ({ name: `settings-matrix${suffix}`, testMatch: SETTINGS_MATRIX_SPEC, use: onEngine(use) })),
  { name: 'settings-matrix-phone', testMatch: SETTINGS_MATRIX_SPEC, use: onEngine(devices['Pixel 7']) },
];

/**
 * The golden path: the real app on every engine and on both phone engines. CI's verify job runs
 * `golden-path` (Chromium); the browser suites workflow runs the rest weekly. Default GPU flags:
 * it measures no frame times, and an uncapped frame rate would only load the runner.
 */
const GOLDEN_PATH_DEVICES: ReadonlyArray<readonly [name: string, use: ProjectUse]> = [
  ['golden-path', devices['Desktop Chrome']],
  ['golden-path-firefox', devices['Desktop Firefox']],
  ['golden-path-webkit', devices['Desktop Safari']],
  ['golden-path-android', devices['Pixel 7']],
  ['golden-path-iphone', devices['iPhone 14']],
];
const goldenPathProjects: Project[] = GOLDEN_PATH_DEVICES.map(([name, use]) => ({ name, testMatch: GOLDEN_PATH_SPEC, use: onEngine(use, false) }));

export default defineConfig({
  testDir: './e2e',
  // e2e/support/*.test.ts are Vitest unit tests of the pure helpers.
  testMatch: '**/*.spec.ts',
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
