import type { AnimationAuditRecorder } from './animation-audit-recorder';
import type { SandboxStep, SandboxStepOp } from './sandbox-step.types';
import type { SandboxClock } from './sandbox.types';

export type StepOf<K extends SandboxStepOp> = Extract<SandboxStep, { op: K }>;

export type StepHandler<K extends SandboxStepOp> = (step: StepOf<K>) => Promise<void> | void;

/**
 * One handler per step op ('repeat' is structural and handled by the runner). Handlers come in
 * groups (core play, capture, faults); the runner merges them, and the compiler checks that the
 * merged map covers every op, so a new op cannot be forgotten.
 */
export type StepHandlerMap = { [K in Exclude<SandboxStepOp, 'repeat'>]: StepHandler<K> };

/** What every handler group may use. */
export interface StepBaseContext {
  clock: SandboxClock;
  recorder: () => AnimationAuditRecorder | null;
}

/** Lets one frame render, so the effect of the previous action is on screen. */
export async function nextFrame(clock: SandboxClock): Promise<void> {
  const frame = clock.stats().frame;
  await clock.waitUntil(() => clock.stats().frame > frame, 1000);
}
