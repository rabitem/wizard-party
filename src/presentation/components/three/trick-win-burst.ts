/**
 * Lifecycle of the trick-win particle burst, advanced once per frame. A burst starts on the
 * rising edge of `active`, runs for `duration` seconds and must see `active` drop before it
 * can start again. The effect is only drawn while a burst runs.
 */
export interface TrickWinBurstState {
  wasActive: boolean;
  animating: boolean;
  startTime: number | null;
}

export interface TrickWinBurstStep {
  state: TrickWinBurstState;
  /** Seconds since the burst started (0 while idle) */
  elapsed: number;
  /** Burst progress from 0 to 1 (0 while idle) */
  progress: number;
  /** True on the frame the burst finished */
  completed: boolean;
}

export const IDLE_TRICK_WIN_BURST: TrickWinBurstState = { wasActive: false, animating: false, startTime: null };

export function stepTrickWinBurst(
  previous: TrickWinBurstState,
  active: boolean,
  now: number,
  duration: number
): TrickWinBurstStep {
  let state = previous;
  if (active && !state.wasActive && !state.animating) state = { wasActive: true, animating: true, startTime: now };
  if (!active && !state.animating && state.wasActive) state = { ...state, wasActive: false };
  if (!state.animating) return { state, elapsed: 0, progress: 0, completed: false };

  const elapsed = now - (state.startTime ?? now);
  const progress = elapsed / duration;
  if (progress >= 1) return { state: { ...state, animating: false, startTime: null }, elapsed, progress: 1, completed: true };
  return { state, elapsed, progress, completed: false };
}
