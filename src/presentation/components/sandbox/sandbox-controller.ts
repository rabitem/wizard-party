import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import { AnimationAuditRecorder } from './animation-audit-recorder';
import { BrowserFaults } from './browser-faults';
import { auditLayout } from './layout-audit';
import { auditScreen } from './playability-audit';
import { readReactCommitTotals, resetReactCommitMaxima } from './react-commit-hook';
import { resolveScenario } from './sandbox-scenario-registry';
import { describeRunEnvironment, flagEnvironment, flagNotReady } from './sandbox-environment';
import { SandboxHoldGate } from './sandbox-hold';
import { currentSandboxProfile, type SandboxProfile } from './sandbox-profile';
import { SandboxStatusStore, type SandboxStatusSnapshot } from './sandbox-status';
import { getSandboxSceneBridge } from './scene-bridge';
import { takeSceneInventory } from './scene-inventory';
import { SandboxStepRunner } from './sandbox-step-runner';
import { createWaitCondition, isSandboxIdle, isSandboxReady } from './sandbox-conditions';
import { SandboxAutoplayer } from './sandbox-autoplayer';
import { SocketFaults } from './socket-faults';
import {
  StepAbort,
  applySettings,
  buildAuditReport,
  buildSandboxTable,
  captureConsole,
  createTracedServer,
  currentSandboxSettings,
  describeRunState,
  endStateOf,
  watchRenderStalls,
} from './sandbox-run-support';
import type {
  AuditReport,
  ObjectSample,
  RenderSample,
  RunEnvironment,
  SandboxClock,
  SandboxGameHandles,
  SandboxLifecycleSink,
  SandboxRunConfig,
  SandboxServer,
  SandboxServerFactory,
  SandboxStep,
  WaitCondition,
} from './sandbox.types';

export type { SandboxStatusSnapshot } from './sandbox-status';

export interface SandboxMount {
  key: number;
  socketFactory: SandboxServer['socketFactory'];
  roomId: string;
}

/**
 * Drives one sandbox run end to end: mounts a fresh client against a fresh loopback
 * server, executes the scenario's steps on the virtual clock, lets everything settle,
 * runs the final invariants and returns the report. One run at a time.
 */
export class SandboxController implements SandboxLifecycleSink {
  private handles: SandboxGameHandles | null = null;
  private recorder: AnimationAuditRecorder | null = null;
  private server: SandboxServer | null = null;
  private config: SandboxRunConfig | null = null;
  private environment: RunEnvironment | null = null;
  private mountKey = 0;
  /** Per-run event counters that wait-for conditions take baselines from. */
  private counts = { connections: 0, dropMarker: 0, collectCompletions: 0, landedCompletions: 0, drawnFrames: 0 };
  private handAnimating = false;
  private autoplay = false;
  private readonly autoplayer = new SandboxAutoplayer(() => this.isIdle());
  /** Frames from a previous mount are ignored while a run tears it down and mounts its own. */
  private acceptingFrames = false;
  private runPhase = 'idle';
  /** Virtual time of the last drawn (probed) frame, for render-stall detection. */
  private lastDrawnAt = 0;
  /** False once the canvas unmounted as a whole (game end, disconnect overlay): no frames are expected then. */
  private sceneMounted = false;
  private stallWatch: (() => void) | null = null;
  private readonly status = new SandboxStatusStore();
  private readonly holds = new SandboxHoldGate((held) => this.status.set({ held }));
  private readonly socketFaults = new SocketFaults(() => {
    this.counts.connections++;
  });
  private readonly browserFaults = new BrowserFaults();
  private running: Promise<AuditReport> | null = null;
  private consoleRestore: (() => void) | null = null;

  constructor(
    private readonly clock: SandboxClock,
    private readonly createServer: SandboxServerFactory,
    private readonly mount: (mount: SandboxMount | null) => void,
    readonly profile: SandboxProfile = currentSandboxProfile()
  ) {}

  // --------------------------------------------------------------------------
  // Wiring from the React tree
  // --------------------------------------------------------------------------

  attachHandles(handles: SandboxGameHandles | null): void {
    this.handles = handles;
  }

  recordFrame(samples: ObjectSample[] | null, render?: RenderSample): void {
    if (!this.recorder || !this.acceptingFrames) return;
    if (render) {
      this.recorder.renderSample(render);
      if (render.drawCalls > 0) this.counts.drawnFrames++;
    }
    this.lastDrawnAt = this.clock.now();
    this.sceneMounted = true;
    this.recorder.frame(this.clock.now(), samples);
    this.recorder.frameCost(this.clock.stats().lastFrameCostMs);
    if (this.autoplay && this.handles) this.autoplayer.act(this.handles);
  }

  sceneUnmounted(): void {
    this.sceneMounted = false;
    if (this.acceptingFrames) this.recorder?.sceneUnmounted(this.clock.now());
  }

  cardLanded(cardId: string): void { this.recorder?.cardLanded(this.clock.now(), cardId); }

  allCardsLanded(): void {
    this.counts.landedCompletions++;
    this.recorder?.allCardsLanded(this.clock.now());
  }

  trickCollectComplete(): void {
    this.counts.collectCompletions++;
    this.recorder?.trickCollectComplete(this.clock.now());
  }

  playedAnimationComplete(cardId: string): void { this.recorder?.playedAnimationComplete(this.clock.now(), cardId); }

  handAnimationProgress(progress: number): void {
    const animating = progress > 0 && progress < 1;
    if (animating !== this.handAnimating) {
      this.recorder?.log(this.clock.now(), 'client', animating ? 'hand-animation-start' : 'hand-animation-end');
    }
    this.handAnimating = animating;
  }

  subscribe(listener: (status: SandboxStatusSnapshot) => void): () => void {
    return this.status.subscribe(listener);
  }

  getStatus(): SandboxStatusSnapshot {
    return this.status.current;
  }

  /** Live (partial) report of the current or last run. */
  currentReport(): AuditReport | null {
    return this.status.current.lastReport;
  }

  getHandles(): SandboxGameHandles | null {
    return this.handles;
  }

  /** Releases the run's current hold (a snapshot or external step); false when nothing matching is held. */
  release(label?: string): boolean {
    return this.holds.release(label);
  }

  // --------------------------------------------------------------------------
  // Runs
  // --------------------------------------------------------------------------

  run(config: SandboxRunConfig): Promise<AuditReport> {
    if (this.running) return Promise.reject(new Error('A sandbox run is already in progress'));
    this.running = this.execute(config).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** Unmounts the game and stops the server, leaving the sandbox empty. */
  stop(): void {
    this.holds.cancel();
    this.browserFaults.reset();
    this.server?.dispose();
    this.server = null;
    this.recorder = null;
    this.mount(null);
    this.status.set({ status: 'idle', step: null });
  }

  private async execute(config: SandboxRunConfig): Promise<AuditReport> {
    const wallClockStart = this.clock.realNow();
    const scenario = resolveScenario(config.scenario);
    const runId = config.id ?? `${scenario.id}-${Date.now().toString(36)}`;
    this.status.set({ status: 'starting', runId, scenario: scenario.id, step: null, anomalies: 0 });

    const recorder = new AnimationAuditRecorder({ motionChecks: this.profile.motionChecks });
    this.recorder = recorder;
    this.config = config;
    this.acceptingFrames = false;
    this.runPhase = 'teardown of the previous mount';
    this.consoleRestore = captureConsole(() => this.recorder, () => this.clock.now(), () => this.runPhase);
    recorder.start(this.clock.now());
    recorder.log(this.clock.now(), 'run', 'teardown');

    // Fresh client per run: tear down the previous game (errors land in this report, labelled) before switching settings.
    this.server?.dispose();
    this.mount(null);
    this.handles = null;
    await this.clock.step(2);

    if (config.settings) applySettings(config.settings);
    const environment = describeRunEnvironment(this.profile);
    this.environment = environment;

    this.counts = { connections: 0, dropMarker: 0, collectCompletions: 0, landedCompletions: 0, drawnFrames: 0 };
    this.handAnimating = false;
    this.autoplay = false;
    this.autoplayer.reset();
    this.socketFaults.reset();
    this.clock.resetFrameCostStats();
    this.runPhase = 'load';
    recorder.log(this.clock.now(), 'run', 'start', { scenario: scenario.id, settings: currentSandboxSettings(), profile: this.profile.name });
    flagEnvironment(recorder, this.clock.now(), environment);

    const server = createTracedServer(this.createServer, buildSandboxTable(config, scenario), recorder, () => this.clock.now());
    this.server = server;
    this.acceptingFrames = true;
    this.mount({ key: ++this.mountKey, socketFactory: this.socketFaults.wrap(server.socketFactory), roomId: 'sandbox' });

    try {
      await this.startScenario(recorder, server, environment);
      await this.runSteps(scenario.steps);
    } catch (error) {
      if (!(error instanceof StepAbort)) {
        recorder.flag(this.clock.now(), 'step-failed', error instanceof Error ? error.message : String(error));
      }
    }

    await this.settle(config);
    return this.finishRun({ runId, scenarioId: scenario.id, config, recorder, environment, wallClockStart });
  }

  /** Waits for the client and scene, marks the run ready and lets the bots play. */
  private async startScenario(recorder: AnimationAuditRecorder, server: SandboxServer, environment: RunEnvironment): Promise<void> {
    const ready = await this.clock.waitUntilReal(() => this.isReady(), SANDBOX_AUDIT.READY_TIMEOUT_REAL_MS);
    if (!ready) {
      flagNotReady(recorder, this.clock.now(), environment, describeRunState(this.handles, this.server, this.recorder));
      throw new StepAbort();
    }
    await this.clock.advance(SANDBOX_AUDIT.READY_SETTLE_FRAMES * (1000 / 60));
    resetReactCommitMaxima();
    const bridge = getSandboxSceneBridge();
    recorder.markReady(this.clock.now(), { react: readReactCommitTotals(), inventory: bridge ? takeSceneInventory(bridge.scene) : null });
    this.lastDrawnAt = this.clock.now();
    this.stallWatch = watchRenderStalls(this.clock, recorder, {
      lastDrawnAt: () => this.lastDrawnAt,
      // A lost context draws nothing by design; the restore check (lose-context step) judges it.
      isActive: () => this.sceneMounted && !!this.handles?.isConnected && !getSandboxSceneBridge()?.renderer.getContext().isContextLost(),
      phase: () => this.runPhase,
    });
    this.runPhase = 'scenario';
    server.setBotPacing({ mode: 'auto' });
    this.status.set({ status: 'running' });
  }

  /** Settled means idle for a run of consecutive frames, not one instant between two queued cards. */
  private async settle(config: SandboxRunConfig): Promise<void> {
    this.status.set({ status: 'settling', step: 'settle' });
    this.runPhase = 'settle';
    // Faults end with the scenario: the settle phase and the report see a healthy browser.
    this.browserFaults.reset();
    this.socketFaults.setOffline(false);
    let idleFrames = 0;
    await this.clock.waitUntil(() => {
      idleFrames = this.isIdle() ? idleFrames + 1 : 0;
      return idleFrames >= SANDBOX_AUDIT.SETTLED_IDLE_FRAMES;
    }, config.settleMs ?? SANDBOX_AUDIT.SETTLE_MS);
  }

  private finishRun(run: Omit<Parameters<typeof buildAuditReport>[0], 'wallDurationMs' | 'frameTiming'> & { wallClockStart: number }): AuditReport {
    const { recorder, wallClockStart, ...identity } = run;
    // Page layout on every run; the full playability audit runs at checkpoints and snapshots.
    auditLayout(recorder, this.clock.now(), 'end');
    recorder.finish(this.clock.now(), endStateOf(this.handles), readReactCommitTotals());
    recorder.log(this.clock.now(), 'run', 'end');
    this.holds.cancel();
    this.consoleRestore?.();
    this.consoleRestore = null;
    this.stallWatch?.();
    this.stallWatch = null;

    const report = buildAuditReport({
      ...identity,
      recorder,
      wallDurationMs: Math.round(this.clock.realNow() - wallClockStart),
      frameTiming: this.clock.frameTiming?.(),
    });
    this.status.set({ status: 'done', step: null, anomalies: report.anomalies.length, lastReport: report });
    return report;
  }

  // --------------------------------------------------------------------------
  // Conditions
  // --------------------------------------------------------------------------

  private isReady(): boolean {
    return isSandboxReady(this.handles, this.recorder, getSandboxSceneBridge() !== null);
  }

  private isIdle(): boolean {
    return isSandboxIdle(this.handles, this.server, this.recorder);
  }

  private readonly conditions = {
    handles: () => this.handles,
    server: () => this.server,
    recorder: () => this.recorder,
    isIdle: () => this.isIdle(),
    collectCompletions: () => this.counts.collectCompletions,
    landedCompletions: () => this.counts.landedCompletions,
    reconnected: () => this.counts.connections > this.counts.dropMarker,
  };

  private async waitFor(until: WaitCondition, timeoutMs: number = SANDBOX_AUDIT.WAIT_TIMEOUT_MS): Promise<void> {
    const met = await this.clock.waitUntil(createWaitCondition(until, this.conditions), timeoutMs);
    if (!met) {
      this.recorder?.flag(this.clock.now(), 'wait-timeout', `Timed out after ${timeoutMs}ms waiting for ${until}`, until, describeRunState(this.handles, this.server, this.recorder));
      throw new StepAbort();
    }
  }

  // --------------------------------------------------------------------------
  // Steps
  // --------------------------------------------------------------------------

  private auditScreen(label: string): void {
    const recorder = this.recorder;
    const environment = this.environment;
    if (!recorder || !environment) return;
    auditScreen({
      recorder,
      t: this.clock.now(),
      label,
      handles: this.handles,
      bridge: getSandboxSceneBridge(),
      input: { touch: environment.touch, formFactor: environment.formFactor },
    });
  }

  private async runSteps(steps: SandboxStep[]): Promise<void> {
    const runner = new SandboxStepRunner({
      ...this.conditions,
      clock: this.clock,
      waitFor: (until, timeoutMs) => this.waitFor(until, timeoutMs),
      setAutoplay: (enabled) => {
        this.autoplay = enabled;
      },
      markConnectionDrop: () => {
        this.counts.dropMarker = this.counts.connections;
      },
      onStep: (label) => this.status.set({ step: label, anomalies: this.recorder?.anomalyList().length ?? 0 }),
      holds: this.holds,
      interactive: () => this.config?.interactive === true,
      auditScreen: (label) => this.auditScreen(label),
      socket: this.socketFaults,
      browser: this.browserFaults,
      drawnFrames: () => this.counts.drawnFrames,
    });
    await runner.run(steps);
  }
}
