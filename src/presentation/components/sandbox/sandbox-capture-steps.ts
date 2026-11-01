import { SANDBOX_AUDIT } from '../../config/sandbox.config';
import { readReactCommitTotals, resetReactCommitMaxima } from './react-commit-hook';
import { currentSandboxSettings } from './sandbox-run-support';
import { getSandboxSceneBridge, type SandboxSceneBridge } from './scene-bridge';
import { takeSceneFacts } from './scene-inventory';
import type { SandboxHold, SandboxHoldGate } from './sandbox-hold';
import type { StepBaseContext, StepHandlerMap } from './sandbox-step-handlers';
import type { SandboxSettings } from './sandbox.types';

export interface CaptureStepContext extends StepBaseContext {
  holds: SandboxHoldGate;
  /** True when a driver is attached that releases holds (run config `interactive`). */
  interactive: () => boolean;
  /** Full layout and playability audit of the frame on screen. */
  auditScreen: (label: string) => void;
}

const LABEL_PLACEHOLDER = /\{(cardTheme|tableTheme|theme|collectionAnimation|cardNumberSize)\}/g;

/** Fills {tableTheme}-style placeholders, so a repeated snapshot step names each theme it visits. */
export function resolveSnapshotLabel(label: string, settings: SandboxSettings): string {
  return label.replace(LABEL_PLACEHOLDER, (_, key: keyof SandboxSettings) => String(settings[key]));
}

async function waitForLoads(context: CaptureStepContext, bridge: SandboxSceneBridge | null): Promise<void> {
  const deadline = context.clock.realNow() + SANDBOX_AUDIT.SNAPSHOT_LOAD_TIMEOUT_REAL_MS;
  // The scene updates pendingLoads asynchronously, so read it through a call each iteration.
  const isLoading = () => (bridge?.pendingLoads ?? 0) > 0;
  while (isLoading() && context.clock.realNow() < deadline) {
    await context.clock.realDelay(SANDBOX_AUDIT.SNAPSHOT_LOAD_POLL_REAL_MS);
  }
}

/** PNG of the next frame, read inside the frame that drew it. */
async function captureImage(context: CaptureStepContext, bridge: SandboxSceneBridge): Promise<string | null> {
  const image = bridge.captureFrame();
  await context.clock.step(1);
  return image;
}

async function holdFor(context: CaptureStepContext, hold: SandboxHold): Promise<void> {
  const released = await context.holds.hold(hold, context.clock.realDelay(SANDBOX_AUDIT.HOLD_TIMEOUT_REAL_MS));
  if (released) return;
  context.recorder()?.flag(context.clock.now(), 'hold-timeout', `No driver released ${hold.kind} "${hold.label}" within ${SANDBOX_AUDIT.HOLD_TIMEOUT_REAL_MS / 1000}s`, hold.label);
}

/**
 * Snapshot, external-input and measurement steps: the points where a run freezes for an image,
 * hands control to its driver, or brackets the frames a budget is judged on.
 */
export function createCaptureSteps(context: CaptureStepContext): Pick<StepHandlerMap, 'snapshot' | 'external' | 'measure-start' | 'measure-end'> {
  const { clock } = context;
  return {
    async snapshot(step) {
      const settings = currentSandboxSettings();
      const label = resolveSnapshotLabel(step.label, settings);
      const { mode, speed } = clock.stats();
      clock.setMode('paused');
      // The real clock cannot pause; there a snapshot is taken in flight and never held.
      const frozen = clock.stats().mode === 'paused';
      try {
        const bridge = getSandboxSceneBridge();
        await waitForLoads(context, bridge);
        await clock.step(SANDBOX_AUDIT.SNAPSHOT_SETTLE_FRAMES);
        context.auditScreen(label);
        const image = step.image && bridge ? await captureImage(context, bridge) : null;
        const held = !!step.hold && frozen && context.interactive();
        context.recorder()?.addSnapshot({
          label,
          t: clock.now(),
          frame: clock.stats().frame,
          held,
          settings,
          facts: bridge ? takeSceneFacts(bridge.scene, bridge.camera, bridge.renderer) : null,
          ...(image ? { image } : {}),
        });
        if (held) await holdFor(context, { kind: 'snapshot', label });
      } finally {
        if (frozen) clock.setMode(mode, speed);
      }
    },

    async external(step) {
      if (!context.interactive()) {
        context.recorder()?.log(clock.now(), 'step', 'external-skipped', { label: step.label, reason: 'no driver attached' });
        return;
      }
      const { mode, speed } = clock.stats();
      // Real input arrives at real pace; the table must animate at real pace while it does.
      clock.setMode('play', 1);
      try {
        await holdFor(context, { kind: 'external', label: step.label });
      } finally {
        clock.setMode(mode, speed);
      }
    },

    'measure-start': (step) => {
      resetReactCommitMaxima();
      context.recorder()?.startWindow(clock.now(), step.label, readReactCommitTotals());
    },

    'measure-end': (step) => {
      const recorder = context.recorder();
      if (recorder && !recorder.endWindow(clock.now(), step.label, readReactCommitTotals())) {
        throw new Error(`No measurement window "${step.label}" is open`);
      }
    },
  };
}
