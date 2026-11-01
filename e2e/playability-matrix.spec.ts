import { SANDBOX_VIEWPORTS, type SandboxViewport } from '../src/presentation/config/sandbox.config';
import { expectCleanRun, test } from './support/sandbox';

/**
 * The viewport matrix on every desktop engine (its own projects: viewport-matrix on Chromium,
 * viewport-matrix-firefox, viewport-matrix-webkit): phones from the iPhone SE to a folded Galaxy
 * Fold in both orientations, iPad mini to iPad Pro in both orientations, and a 1366x768 laptop up
 * to a 4K desktop, each with touch and device pixel ratio as on the device. Firefox has no mobile
 * emulation (isMobile), so there the phones and tablets are touch windows of the same size.
 * Every viewport plays the largest hand the table size deals.
 *
 * Pull requests run the key viewports at the smallest and largest table; E2E_FULL_MATRIX=1
 * (the weekly run) runs every viewport at every table size.
 */
const FULL_MATRIX = process.env.E2E_FULL_MATRIX === '1';
const KEY_VIEWPORTS = new Set(['iphone-se', 'phone-landscape-narrow', 'galaxy-fold-folded', 'ipad-mini-landscape', 'laptop', 'uhd-4k']);
const PLAYER_COUNTS = FULL_MATRIX ? [3, 4, 5, 6] : [3, 6];
const VIEWPORTS: readonly SandboxViewport[] = FULL_MATRIX ? SANDBOX_VIEWPORTS : SANDBOX_VIEWPORTS.filter((viewport) => KEY_VIEWPORTS.has(viewport.id));

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.id} (${viewport.width}x${viewport.height})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      hasTouch: viewport.hasTouch,
      // Playwright's fixture callback; named `provide` so it is not mistaken for a React hook.
      isMobile: async ({ browserName }, provide) => provide(browserName !== 'firefox' && viewport.isMobile),
    });

    for (const playerCount of PLAYER_COUNTS) {
      test(`${playerCount} players: the largest hand is playable`, async ({ sandbox }) => {
        expectCleanRun(await sandbox.run({ id: `max-hand-${viewport.id}-${playerCount}p`, scenario: 'max-hand', playerCount }));
      });
    }
  });
}
