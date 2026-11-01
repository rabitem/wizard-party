import { existsSync } from 'node:fs';
import { VISUAL_BUDGETS } from '../src/presentation/config/sandbox-budgets.config';
import { expect, expectCleanRun, test } from './support/sandbox';

/**
 * Visual regressions: the room tour freezes the clock on a quiet table once per table theme and
 * UI theme; each frozen frame is compared with its baseline (per project, so per engine and
 * viewport). Live timers and transient feedback are masked; particles and ambient motion are
 * covered by the pixel tolerance.
 *
 * Baselines are generated on CI, never locally (GPU and fonts differ): run the "Browser suites"
 * workflow with update_snapshots, download the visual-baselines-* artifacts and commit their
 * e2e/visual.spec.ts-snapshots files. A missing baseline is reported and skipped, not failed.
 */
test('every table and UI theme matches its reference frame', async ({ sandbox, page }, testInfo) => {
  test.setTimeout(testInfo.timeout * 2);
  const updating = testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed';
  const missing: string[] = [];

  const report = await sandbox.runInteractive({ scenario: 'room-tour', playerCount: 4 }, async (hold) => {
    if (hold.kind !== 'snapshot') return;
    const name = `${hold.label}.png`;
    if (!updating && !existsSync(testInfo.snapshotPath(name, { kind: 'screenshot' }))) {
      missing.push(name);
      return;
    }
    await expect.soft(page).toHaveScreenshot(name, {
      mask: VISUAL_BUDGETS.MASK_SELECTORS.map((selector) => page.locator(selector)),
      maxDiffPixelRatio: VISUAL_BUDGETS.MAX_DIFF_PIXEL_RATIO,
      threshold: VISUAL_BUDGETS.PIXEL_THRESHOLD,
      animations: 'disabled',
    });
  });

  if (missing.length > 0) {
    testInfo.annotations.push({ type: 'missing-baseline', description: `${missing.length} baseline(s) missing, run the workflow with update_snapshots: ${missing.join(', ')}` });
  }
  expect(report.snapshots.length, 'the tour froze a frame per theme').toBeGreaterThan(0);
  expectCleanRun(report);
});
