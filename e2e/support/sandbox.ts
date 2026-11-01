import { expect, test as base, type Page, type TestInfo } from '@playwright/test';
import { installReactCommitHook } from '../../src/presentation/components/sandbox/react-commit-hook';
import type {
  Anomaly,
  AuditReport,
  SandboxDimensions,
  SandboxProfileName,
  SandboxRunConfig,
} from '../../src/presentation/components/sandbox';
import type { SandboxHold } from '../../src/presentation/components/sandbox/sandbox-hold';
import { knownIssueFor } from './known-issues';
import { muteAudio } from './mute-audio';

export type SandboxClockMode = 'fast' | 'real';
/** 'perf' samples the probe every Nth frame and skips per-commit render counting (see sandbox-profile.ts). */
export type SandboxProfileMode = SandboxProfileName;

/** The snapshot or external step a run is parked on, as status().held reports it. */
export type SandboxHoldState = SandboxHold;

/** The sandbox agent API, driven from the test process. */
export interface SandboxDriver {
  run(config: SandboxRunConfig): Promise<AuditReport>;
  /**
   * Runs with a driver attached: every held snapshot or external step is handed to `onHold`,
   * then released, until the run ends. The report is returned as with run().
   */
  runInteractive(config: SandboxRunConfig, onHold: (hold: SandboxHoldState) => Promise<void>): Promise<AuditReport>;
  dimensions(): Promise<SandboxDimensions>;
  page: Page;
}

const SANDBOX_PATH = '/sandbox/animations';
/** What the sandbox route answers in a build without NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX. */
const HTTP_NOT_FOUND = 404;
const SANDBOX_READY_TIMEOUT_MS = 120_000;
/** Poll interval while a driver waits for the next hold or the end of an interactive run. */
const HOLD_POLL_MS = 100;

async function openSandbox(page: Page, clock: SandboxClockMode, profile: SandboxProfileMode): Promise<void> {
  // A simulated game must never reach real APIs (stats, sessions, telemetry).
  await page.route('**/api/**', (route) => route.fulfill({ status: 204, body: '' }));
  // Before any page script: React DOM and R3F register with it as they load, so commits are counted.
  await page.addInitScript(installReactCommitHook);
  await page.addInitScript(muteAudio);
  const perf = profile === 'perf' ? '&perf=1' : '';
  const response = await page.goto(`${SANDBOX_PATH}?clock=${clock}&ui=0${perf}`, { waitUntil: 'domcontentloaded' });
  // The web server is ready once the home page answers, which a plain `npm run build` serves too.
  if (response?.status() === HTTP_NOT_FOUND) {
    throw new Error(`${SANDBOX_PATH} is not in this build: run \`npm run e2e:build\` (a plain \`npm run build\` leaves the sandbox out), and stop any server it would reuse.`);
  }
  await page.waitForFunction(() => Boolean(window.__wizardSandbox), undefined, { timeout: SANDBOX_READY_TIMEOUT_MS });
}

function applyKnownIssue(testInfo: TestInfo): void {
  const issue = knownIssueFor(testInfo.titlePath.slice(1).join(' › '), testInfo.project.name);
  if (!issue) return;
  testInfo.annotations.push({ type: 'known-issue', description: issue.reason });
  if (issue.mode === 'fails') testInfo.fail(true, issue.reason);
  else testInfo.fixme(true, issue.reason);
}

async function attachReport(testInfo: TestInfo, page: Page, report: AuditReport): Promise<void> {
  const { webgl } = report.environment;
  testInfo.annotations.push({
    type: 'webgl',
    description: `${webgl.renderer ?? 'no WebGL'}${webgl.software ? ' (software)' : ''}, WebGL ${webgl.webgl2 ? '2' : webgl.webgl1 ? '1' : 'unavailable'}`,
  });
  const { snapshots: _images, ...rest } = report;
  const snapshots = report.snapshots.map(({ image: _image, ...snapshot }) => snapshot);
  await testInfo.attach(`${report.runId}.json`, { body: JSON.stringify({ ...rest, snapshots }, null, 2), contentType: 'application/json' });
  if (!report.passed) {
    await testInfo.attach(`${report.runId}.png`, { body: await page.screenshot(), contentType: 'image/png' });
  }
}

async function runInteractive(page: Page, config: SandboxRunConfig, onHold: (hold: SandboxHoldState) => Promise<void>): Promise<AuditReport> {
  await page.evaluate((runConfig) => {
    const api = window.__wizardSandbox;
    if (!api) throw new Error('Animation sandbox API is not loaded');
    const scope = window as unknown as { __wizardRun?: Promise<AuditReport> };
    scope.__wizardRun = api.run({ ...runConfig, interactive: true });
  }, config);

  for (;;) {
    const state = await page.evaluate(() => {
      const status = window.__wizardSandbox?.status();
      return { held: status?.held ?? null, done: status?.status === 'done' || status?.status === 'idle' };
    });
    if (state.held) {
      try {
        await onHold(state.held);
      } finally {
        await page.evaluate((label) => window.__wizardSandbox?.release(label), state.held.label);
      }
    } else if (state.done) {
      break;
    } else {
      await page.waitForTimeout(HOLD_POLL_MS);
    }
  }
  return page.evaluate(() => (window as unknown as { __wizardRun: Promise<AuditReport> }).__wizardRun);
}

/**
 * `sandbox` fixture: a page with the sandbox loaded on the requested clock and profile. Every
 * run's report (and a screenshot for failing runs) is attached to the test result, with the
 * WebGL renderer it ran on as an annotation. A test on the known-issues list is marked before the
 * page opens (support/known-issues.ts).
 */
export const test = base.extend<{ clock: SandboxClockMode; profile: SandboxProfileMode; sandbox: SandboxDriver }>({
  clock: ['fast', { option: true }],
  profile: ['audit', { option: true }],
  // Playwright's fixture callback; named `provide` so it is not mistaken for a React hook.
  sandbox: async ({ page, clock, profile }, provide, testInfo) => {
    applyKnownIssue(testInfo);
    await openSandbox(page, clock, profile);
    await provide({
      page,
      async run(config) {
        const report = await page.evaluate((runConfig) => {
          if (!window.__wizardSandbox) throw new Error('Animation sandbox API is not loaded');
          return window.__wizardSandbox.run(runConfig);
        }, config);
        await attachReport(testInfo, page, report);
        return report;
      },
      async runInteractive(config, onHold) {
        const report = await runInteractive(page, config, onHold);
        await attachReport(testInfo, page, report);
        return report;
      },
      dimensions: () => page.evaluate(() => {
        if (!window.__wizardSandbox) throw new Error('Animation sandbox API is not loaded');
        return window.__wizardSandbox.dimensions();
      }),
    });
  },
});

export { expect };

function describeFindings(findings: Anomaly[]): string {
  return findings.map((anomaly) => `${anomaly.severity} ${anomaly.code} @${Math.round(anomaly.t)}ms: ${anomaly.message}`).join('\n');
}

/** A run is clean when it has no error or warning anomalies (info is diagnostic only). */
export function expectCleanRun(report: AuditReport): void {
  const findings = report.anomalies.filter((anomaly) => anomaly.severity !== 'info');
  expect(findings, `${report.runId} has findings:\n${describeFindings(findings)}`).toEqual([]);
}
