import { RENDER_BUDGET_SCENARIO } from '../src/presentation/config/sandbox-budgets.config';
import { describeWindows, expectIdleBudgets, expectResourceBudgets, expectWarmRoundBudgets } from './support/budgets';
import { expectCleanRun, test } from './support/sandbox';

/**
 * Deterministic render and React budgets on the virtual clock: draw calls (all passes and
 * shadow passes), triangles, shader links after warm-up, texture uploads per round, idle work,
 * lights and programs, React commits. Counts, not timings, so they hold on CI's software
 * renderer exactly as on a real GPU, and a regression names what grew.
 */
const PLAYER_COUNTS = [3, 4, 5, 6] as const;

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

test('every table theme stays within the six-player budget', async ({ sandbox }, testInfo) => {
  // Each environment adds its own meshes, lights and effects; one run per theme, judged alike.
  test.setTimeout(testInfo.timeout * 3);
  const { tableTheme: themes } = await sandbox.dimensions();
  for (const tableTheme of themes) {
    const report = await sandbox.run({ id: `${RENDER_BUDGET_SCENARIO.ID}-${tableTheme}`, scenario: RENDER_BUDGET_SCENARIO.ID, playerCount: 6, settings: { tableTheme } });
    testInfo.annotations.push({ type: tableTheme, description: describeWindows(report) });
    expectIdleBudgets(report);
    expectWarmRoundBudgets(report, 6);
    expectResourceBudgets(report);
  }
});

test('an idle table waiting for your lead does no render or React work', async ({ sandbox }, testInfo) => {
  const report = await sandbox.run({ scenario: 'idle-table-10s', playerCount: 6 });
  testInfo.annotations.push({ type: 'windows', description: describeWindows(report) });
  expectCleanRun(report);
  expectIdleBudgets(report, 'idle');
});
