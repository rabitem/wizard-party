import { RENDER_BUDGET_SCENARIO } from '../src/presentation/config/sandbox-budgets.config';
import { TABLE_THEME_PALETTES } from '../src/presentation/config/table-theme.config';
import { describeWindows, expectIdleBudgets, expectResourceBudgets, expectWarmRoundBudgets } from './support/budgets';
import { expectCleanRun, test } from './support/sandbox';

/**
 * Deterministic render and React budgets on the virtual clock: draw calls (all passes and
 * shadow passes), triangles, shader links after warm-up, texture uploads per round, idle work,
 * lights and programs, React commits. Counts, not timings, so they hold on CI's software
 * renderer exactly as on a real GPU, and a regression names what grew.
 */
const PLAYER_COUNTS = [3, 4, 5, 6] as const;

// Each scenario owns a fresh page; individual themes can be distributed across CI shards.
test.describe.configure({ mode: 'parallel' });

for (const playerCount of PLAYER_COUNTS) {
  test(`${playerCount} players: render and React work stay within budget`, async ({ sandbox }, testInfo) => {
    const report = await sandbox.run({ scenario: RENDER_BUDGET_SCENARIO.ID, playerCount });
    testInfo.annotations.push({ type: 'windows', description: describeWindows(report) });
    expectCleanRun(report);
    expectIdleBudgets(report);
    expectWarmRoundBudgets(report, playerCount);
    expectResourceBudgets(report);
  });
}

for (const { id: tableTheme } of TABLE_THEME_PALETTES) {
  test(`table theme ${tableTheme} stays within the six-player budget`, async ({ sandbox }, testInfo) => {
    const report = await sandbox.run({ id: `${RENDER_BUDGET_SCENARIO.ID}-${tableTheme}`, scenario: RENDER_BUDGET_SCENARIO.ID, playerCount: 6, settings: { tableTheme } });
    testInfo.annotations.push({ type: tableTheme, description: describeWindows(report) });
    expectIdleBudgets(report);
    expectWarmRoundBudgets(report, 6);
    expectResourceBudgets(report);
  });
}

test('an idle table waiting for your lead does no render or React work', async ({ sandbox }, testInfo) => {
  const report = await sandbox.run({ scenario: 'idle-table-10s', playerCount: 6 });
  testInfo.annotations.push({ type: 'windows', description: describeWindows(report) });
  expectCleanRun(report);
  expectIdleBudgets(report, 'idle');
});
