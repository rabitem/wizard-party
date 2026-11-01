export interface TimerCountdownInput {
  playerId: string;
  sequence: number;
  durationMs: number;
  expiresAt: number;
  expired: boolean;
  serverNow?: number;
}

export interface TimerCountdownSync {
  key: string;
  syncedAt: number;
  remainingMsAtSync: number;
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function getTimerSyncKey(timer: TimerCountdownInput): string {
  return `${timer.playerId}:${timer.sequence}:${timer.expiresAt}:${timer.serverNow ?? 'local'}`;
}

function clampRemainingMs(timer: TimerCountdownInput, remainingMs: number): number {
  const durationMs = Math.max(0, timer.durationMs);
  return Math.max(0, Math.min(durationMs, remainingMs));
}

export function createTimerCountdownSync(
  timer: TimerCountdownInput,
  localNow: number
): TimerCountdownSync {
  const referenceNow = isFiniteNumber(timer.serverNow) ? timer.serverNow : localNow;
  const remainingMs = timer.expired ? 0 : timer.expiresAt - referenceNow;

  return {
    key: getTimerSyncKey(timer),
    syncedAt: localNow,
    remainingMsAtSync: clampRemainingMs(timer, remainingMs),
  };
}

export function getTimerCountdownSeconds(
  sync: TimerCountdownSync | null,
  localNow: number
): number {
  if (!sync) return 0;
  const localElapsedMs = Math.max(0, localNow - sync.syncedAt);
  return Math.max(0, Math.ceil((sync.remainingMsAtSync - localElapsedMs) / 1000));
}
