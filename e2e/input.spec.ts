import type { Page } from '@playwright/test';
import { expect, expectCleanRun, test } from './support/sandbox';

/**
 * Touch input. Synthetic touch pointers (pointerType touch, a pointer id per finger) drive a
 * finger drag and a second finger landing mid-drag, on every project. On touch devices the
 * driver also plays a card with real device input: CDP touch events on Chromium (a drag to the
 * table), the Playwright touchscreen elsewhere (a double tap).
 */
const SYNTHETIC_TOUCH_SCENARIOS = ['touch-drag-throw', 'second-finger-drag'] as const;
/** Real touch moves, at about one per display frame. */
const TOUCH_MOVE_STEPS = 12;
const TOUCH_MOVE_INTERVAL_MS = 16;
const DOUBLE_TAP_GAP_MS = 120;

interface Point {
  x: number;
  y: number;
}

for (const scenario of SYNTHETIC_TOUCH_SCENARIOS) {
  test(`${scenario} plays cleanly`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario, playerCount: 4 }));
  });
}

function handSize(page: Page): Promise<number> {
  return page.evaluate(() => (window.__wizardSandbox?.game()?.localHand as unknown[] | undefined)?.length ?? 0);
}

async function dragByCdpTouch(page: Page, from: Point, to: Point): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
    for (let step = 1; step <= TOUCH_MOVE_STEPS; step++) {
      const progress = step / TOUCH_MOVE_STEPS;
      const point = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
      await page.waitForTimeout(TOUCH_MOVE_INTERVAL_MS);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

async function doubleTapByTouchscreen(page: Page, point: Point): Promise<void> {
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForTimeout(DOUBLE_TAP_GAP_MS);
  await page.touchscreen.tap(point.x, point.y);
}

test('a real touch plays a card', async ({ sandbox, page, browserName, hasTouch }) => {
  test.skip(!hasTouch, 'Real touch input needs a touch device project');

  const report = await sandbox.runInteractive({ scenario: 'real-touch-play', playerCount: 4 }, async (hold) => {
    if (hold.kind !== 'external') return;
    const card = await page.evaluate(() => window.__wizardSandbox?.handCardPoint() ?? null);
    const table = await page.evaluate(() => window.__wizardSandbox?.tablePoint() ?? null);
    expect(card, 'a playable hand card is on screen').not.toBeNull();
    expect(table, 'the table centre is on screen').not.toBeNull();
    if (!card || !table) return;

    const before = await handSize(page);
    if (browserName === 'chromium') await dragByCdpTouch(page, card.point, table);
    else await doubleTapByTouchscreen(page, card.point);
    await expect.poll(() => handSize(page), { message: 'the touched card left the hand' }).toBe(before - 1);
  });
  expectCleanRun(report);
});
