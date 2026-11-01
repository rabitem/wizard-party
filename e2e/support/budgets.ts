import { expect } from '@playwright/test';
import {
  FRAME_BUDGETS,
  REACT_BUDGETS,
  RENDER_BUDGET_SCENARIO,
  RENDER_BUDGETS,
  drawCallBudget,
  warmRoundCardsDealt,
  warmTextureUploadBudget,
} from '../../src/presentation/config/sandbox-budgets.config';
import type { AuditReport, WindowMetrics } from '../../src/presentation/components/sandbox';

/** Soft assertions: one report shows every budget it misses, not just the first. */
const check = expect.soft;

function windowOf(report: AuditReport, label: string): WindowMetrics {
  const measured = report.metrics.windows[label];
  expect(measured, `${report.runId} measured the "${label}" window`).toBeDefined();
  return measured;
}

/** The settled table: nothing re-renders, uploads, links shaders or redraws shadow maps. */
export function expectIdleBudgets(report: AuditReport, label: string = RENDER_BUDGET_SCENARIO.IDLE_WINDOW): void {
  const idle = windowOf(report, label);
  const seconds = Math.max(idle.virtualDurationMs / 1000, 1e-3);
  check(idle.render.shadowDrawCallsMax, 'shadow-map draws while idle').toBeLessThanOrEqual(RENDER_BUDGETS.IDLE_SHADOW_DRAW_CALLS_MAX);
  check(idle.render.textureUploads, 'texture uploads while idle').toBeLessThanOrEqual(RENDER_BUDGETS.IDLE_TEXTURE_UPLOADS_MAX);
  check(idle.render.boneUploads, 'bone uploads while idle').toBeLessThanOrEqual(RENDER_BUDGETS.IDLE_BONE_UPLOADS_MAX);
  check(idle.render.programLinks, 'shader links while idle').toBe(0);
  if (idle.react.r3fCommits !== null) {
    check(idle.react.r3fCommits, 'R3F commits while idle').toBeLessThanOrEqual(REACT_BUDGETS.IDLE_R3F_COMMITS_MAX);
  }
  if (idle.react.domCommits !== null) {
    check(idle.react.domCommits / seconds, 'DOM commits per second while idle').toBeLessThanOrEqual(REACT_BUDGETS.IDLE_DOM_COMMITS_PER_SECOND_MAX);
  }
}

/** A whole warm round at server pace: draw calls, triangles, uploads and links within budget. */
export function expectWarmRoundBudgets(report: AuditReport, playerCount: number): void {
  const round = windowOf(report, RENDER_BUDGET_SCENARIO.WARM_ROUND_WINDOW);
  const budget = drawCallBudget(playerCount);
  check(round.render.drawCallsMean, `mean draw calls per frame at ${playerCount} players`).toBeLessThanOrEqual(budget);
  check(round.render.drawCallsMax, 'peak draw calls in one frame').toBeLessThanOrEqual(budget * RENDER_BUDGETS.DRAW_CALLS_PEAK_FACTOR);
  check(round.render.shadowDrawCallsMax, 'shadow-map draws in one frame').toBeLessThanOrEqual(RENDER_BUDGETS.SHADOW_DRAW_CALLS_MAX);
  if (round.render.trianglesMean !== null) {
    check(round.render.trianglesMean, 'mean triangles per frame').toBeLessThanOrEqual(RENDER_BUDGETS.TRIANGLES_MEAN_MAX);
  }
  check(round.render.programLinks, 'shader links after warm-up').toBeLessThanOrEqual(RENDER_BUDGETS.WARM_PROGRAM_LINKS_MAX);
  check(round.render.textureUploads, 'texture uploads in a warm round').toBeLessThanOrEqual(warmTextureUploadBudget(warmRoundCardsDealt(playerCount)));
  check(round.render.boneUploads, 'bone uploads in a warm round').toBeLessThanOrEqual(RENDER_BUDGETS.WARM_ROUND_BONE_UPLOADS_MAX);
  if (round.react.r3fRendersPerCommitMax !== null) {
    check(round.react.r3fRendersPerCommitMax, 'components rendered by one R3F commit').toBeLessThanOrEqual(REACT_BUDGETS.R3F_RENDERS_PER_COMMIT_MAX);
  }
}

/** Resources of the whole run: programs, lights and texture growth over the measured rounds. */
export function expectResourceBudgets(report: AuditReport): void {
  const render = report.metrics.render;
  expect(render, `${report.runId} reports render metrics`).toBeDefined();
  if (!render) return;
  check(render.programsAtEnd, 'linked shader programs').toBeLessThanOrEqual(RENDER_BUDGETS.PROGRAMS_MAX);
  check(render.texturesAtEnd - render.texturesAtReady, 'GPU texture growth over the run').toBeLessThanOrEqual(RENDER_BUDGETS.TEXTURE_GROWTH_PER_ROUND_MAX * 2);
  if (render.inventory) {
    check(render.inventory.lights, 'visible punctual lights').toBeLessThanOrEqual(RENDER_BUDGETS.LIGHTS_MAX);
  }
}

/** Real-clock frame budgets: p95 frame interval, main-thread work per frame and the probe's own cost. */
export function expectFrameBudgets(report: AuditReport, targetFps: number): void {
  const timing = report.metrics.frameTiming;
  expect(timing, 'real-clock run reports frame timing').toBeDefined();
  if (!timing) return;
  const frameMs = 1000 / targetFps;
  check(timing.p95Ms, `p95 frame time for ${targetFps} fps`).toBeLessThanOrEqual(frameMs * FRAME_BUDGETS.P95_SLACK);
  const render = report.metrics.render;
  if (render?.cpuFrameMs) {
    check(render.cpuFrameMs.p95, 'p95 main-thread work per frame (probe excluded)').toBeLessThanOrEqual(frameMs * FRAME_BUDGETS.CPU_SHARE_OF_FRAME);
  }
  if (render && report.environment.profile === 'perf') {
    check(render.probeMsMean, 'mean probe cost per frame in perf mode').toBeLessThanOrEqual(FRAME_BUDGETS.PROBE_MS_MEAN_MAX);
  }
}

/**
 * Real-clock frame interval over the warm round only: shaders compiled, textures uploaded, so
 * first-use hitches of the warm-up round do not hide (or excuse) steady-state cost.
 */
export function expectWarmFrameBudget(report: AuditReport, targetFps: number): void {
  const round = windowOf(report, RENDER_BUDGET_SCENARIO.WARM_ROUND_WINDOW);
  expect(round.render.frameCostMs, 'warm round reports frame intervals').not.toBeNull();
  if (!round.render.frameCostMs) return;
  check(round.render.frameCostMs.p95, `warm-round p95 frame time for ${targetFps} fps`).toBeLessThanOrEqual((1000 / targetFps) * FRAME_BUDGETS.P95_SLACK);
}

/** One line per measured window, for test annotations. */
export function describeWindows(report: AuditReport): string {
  return Object.values(report.metrics.windows).map(({ label, render, react }) =>
    `${label}: ${render.drawCallsMean} draws/frame (max ${render.drawCallsMax}, shadow max ${render.shadowDrawCallsMax}), ` +
    `${render.textureUploads} uploads, ${render.programLinks} links, R3F commits ${react.r3fCommits ?? 'n/a'}, DOM commits ${react.domCommits ?? 'n/a'}`
  ).join('\n');
}
