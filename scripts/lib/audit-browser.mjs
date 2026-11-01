/** Browser launch and sandbox page helpers for scripts/animation-audit.mjs. */
import { chromium, firefox, webkit } from 'playwright-core';
import { existsSync } from 'node:fs';

const BROWSER_CANDIDATES = [
  process.env.AUDIT_BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

/**
 * Chromium-family flags keep background pages running at full speed, and lift the vsync cap so a
 * real-clock run measures how many frames the engine can produce (the 120 fps target), not 60.
 */
const CHROMIUM_ARGS = [
  '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--disable-gpu-vsync', '--disable-frame-rate-limit',
  // Headless Chromium on Windows renders with SwiftShader (software) unless ANGLE uses Direct3D 11.
  ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : []),
];
// Firefox: layout.frame_rate 0 is "as fast as possible" instead of the display's refresh rate.
const FIREFOX_PREFS = { 'layout.frame_rate': 0, 'webgl.force-enabled': true };
const PAGE_READY_TIMEOUT_MS = 120_000;

function findBrowser(explicit) {
  const candidates = explicit ? [explicit] : BROWSER_CANDIDATES;
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`No Chromium-based browser found. Pass --browser <path> or set AUDIT_BROWSER. Tried: ${candidates.join(', ')}`);
  return found;
}

export async function launchBrowser(options) {
  const headless = !options.headed;
  switch (options.engine ?? 'edge') {
    case 'chromium': return chromium.launch({ headless, args: CHROMIUM_ARGS });
    case 'firefox': return firefox.launch({ headless, firefoxUserPrefs: FIREFOX_PREFS });
    // WebKit has no frame-rate override; its numbers are capped at the display rate.
    case 'webkit': return webkit.launch({ headless });
    case 'edge': return chromium.launch({ executablePath: findBrowser(options.browser), headless, args: CHROMIUM_ARGS });
    default: throw new Error(`Unknown engine "${options.engine}"`);
  }
}

/** Opens the sandbox; `perf` samples the probe every Nth frame (sandbox-profile.ts). */
export async function openSandbox(context, baseUrl, { clock = 'fast', perf = false } = {}) {
  // Second line of defence: a simulated game must never reach real APIs (stats, sessions, telemetry).
  await context.route('**/api/**', (route) => route.fulfill({ status: 204, body: '' }));
  const page = await context.newPage();
  // Uncaught errors are captured inside the page with run phase and stack; only crashes of the
  // page itself (which the in-page capture cannot report) are added here.
  const pageErrors = [];
  page.on('crash', () => pageErrors.push('The page crashed'));
  await page.goto(`${baseUrl}/sandbox/animations?clock=${clock}&ui=0${perf ? '&perf=1' : ''}`, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT_MS });
  await page.waitForFunction(() => Boolean(window.__wizardSandbox), undefined, { timeout: PAGE_READY_TIMEOUT_MS });
  return { page, pageErrors, runs: 0 };
}

export async function readDimensions(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const { page } = await openSandbox(context, baseUrl);
  const dimensions = await page.evaluate(() => window.__wizardSandbox.dimensions());
  await context.close();
  return dimensions;
}

/** Browser context of a sandbox viewport: size, pixel ratio, mobile emulation and touch as on the device. */
export function contextOptionsFor(viewport, engine) {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    // Firefox has no mobile emulation in Playwright; it still gets the touch viewport.
    ...(engine === 'firefox' ? {} : { isMobile: viewport.isMobile }),
    hasTouch: viewport.hasTouch,
  };
}
