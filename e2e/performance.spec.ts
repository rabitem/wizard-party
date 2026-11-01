import { FRAME_BUDGETS, RENDER_BUDGET_SCENARIO } from '../src/presentation/config/sandbox-budgets.config';
import { describeWindows, expectFrameBudgets, expectResourceBudgets, expectWarmFrameBudget } from './support/budgets';
import { test } from './support/sandbox';

/**
 * Frame-time budgets on the real clock, measured in perf mode (the probe samples every Nth frame
 * and its own cost is reported apart): a full round at server pace per table size. Browsers run
 * with their frame-rate cap lifted where possible (Chromium, Firefox), so the numbers show what
 * the engine can sustain. Meaningful on real GPUs only; CI's software renderer skips these.
 *
 *   PERF_TARGET_FPS   frame rate the p95 frame time must sustain (default 60, the playable floor;
 *                     set 120 to enforce the high-refresh target)
 */
const TARGET_FPS = Number(process.env.PERF_TARGET_FPS ?? FRAME_BUDGETS.DEFAULT_TARGET_FPS);

test.use({ clock: 'real', profile: 'perf' });

for (const playerCount of [4, 6] as const) {
  test(`${playerCount} players: a full round sustains ${TARGET_FPS} fps`, async ({ sandbox, browserName }, testInfo) => {
    // WebKit renders this scene at a few fps in software and takes minutes to load it.
    test.slow(browserName === 'webkit', 'WebKit loads and renders the scene far slower');
    const report = await sandbox.run({ scenario: 'perf-round', playerCount });
    test.skip(report.environment.webgl.software, `Software WebGL (${report.environment.webgl.renderer}): frame times are not meaningful`);

    const timing = report.metrics.frameTiming;
    const render = report.metrics.render;
    testInfo.annotations.push(
      ...(timing ? [
        { type: 'fps', description: `${timing.fps} fps, p50 ${timing.p50Ms}ms, p95 ${timing.p95Ms}ms, p99 ${timing.p99Ms}ms, max ${timing.maxMs}ms` },
        { type: '120Hz', description: `${Math.round((1 - timing.over120HzBudget) * 100)}% of frames within 8.3ms` },
      ] : []),
      ...(render ? [
        { type: 'render', description: `${render.drawCallsMean} draw calls/frame (max ${render.drawCallsMax}), textures ${render.texturesAtReady} -> ${render.texturesAtEnd}` },
        { type: 'cpu/gpu', description: `cpu p95 ${render.cpuFrameMs?.p95 ?? 'n/a'}ms, gpu p95 ${render.gpuFrameMs?.p95 ?? 'n/a'}ms, probe ${render.probeMsMean}ms/frame` },
      ] : []),
    );
    if (Object.keys(report.metrics.windows).length > 0) testInfo.annotations.push({ type: 'windows', description: describeWindows(report) });

    expectFrameBudgets(report, TARGET_FPS);
    expectResourceBudgets(report);
  });
}

test(`6 players: a warm round (after a warm-up round) sustains ${TARGET_FPS} fps`, async ({ sandbox, browserName }, testInfo) => {
  test.slow(browserName === 'webkit', 'WebKit loads and renders the scene far slower');
  const report = await sandbox.run({ scenario: RENDER_BUDGET_SCENARIO.ID, playerCount: 6 });
  test.skip(report.environment.webgl.software, `Software WebGL (${report.environment.webgl.renderer}): frame times are not meaningful`);
  testInfo.annotations.push({ type: 'windows', description: describeWindows(report) });
  expectWarmFrameBudget(report, TARGET_FPS);
});
