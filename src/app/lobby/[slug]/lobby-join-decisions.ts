/**
 * When the lobby joins by itself and when it shows the joining screen (pure, so the page and its
 * tests share one decision).
 */
import { isAwaitingSeat, type ConnectionStatus } from '@/presentation/types';

/**
 * Where the lobby's automatic join stands for this visit. `skipped`: the page became ready while a
 * connection already existed, so it never joins by itself. Without it the auto-join stayed armed and
 * fired the moment the player left (status back to idle), putting them straight back into the room.
 */
export type AutoRejoinState = 'idle' | 'triggered' | 'failed' | 'skipped';

/**
 * Only a client that holds no connection rejoins from the saved name: one that is reconnecting by
 * itself must not be connected a second time, and a kicked or refused one must not be put back.
 */
export function calcCanAutoRejoin(sessionLoaded: boolean, status: ConnectionStatus, savedUsername: string): boolean {
  return sessionLoaded && status === 'idle' && !!savedUsername;
}

/**
 * An automatic join is underway from the render it becomes possible (before its effect fires)
 * until it fails, so a player who already has a name never sees the name form flash by. A
 * connection the home page started before navigating here is a join awaiting its seat, from the
 * moment it starts connecting, not only once the socket is open.
 */
export function calcIsAutoRejoining({
  canAutoRejoin,
  autoRejoinState,
  status,
  error,
}: {
  canAutoRejoin: boolean;
  autoRejoinState: AutoRejoinState;
  status: ConnectionStatus;
  error: string | null;
}): boolean {
  if (error) return false;
  if (isAwaitingSeat(status, false)) return true;
  return autoRejoinState === 'triggered' || (autoRejoinState === 'idle' && canAutoRejoin);
}

/** A join stays in progress until the server has seated us in this room, not merely once the socket opens. */
export function calcEffectiveIsJoining(manualJoinTriggered: boolean, isAutoRejoining: boolean, isSeated: boolean): boolean {
  return (manualJoinTriggered || isAutoRejoining) && !isSeated;
}

/** What the auto-rejoin effect does now: join once from state (never on a timer), or mark it failed. */
export function getAutoRejoinEffectAction({
  canAutoRejoin,
  isAlreadyConnecting = false,
  autoRejoinState,
  error,
}: {
  canAutoRejoin: boolean;
  /** The page became ready while a connection already existed (the provider reconnected). */
  isAlreadyConnecting?: boolean;
  autoRejoinState: AutoRejoinState;
  error: string | null;
}): 'join' | 'skip' | 'mark-failed' | null {
  if (canAutoRejoin && autoRejoinState === 'idle' && !error) return 'join';
  if (isAlreadyConnecting && autoRejoinState === 'idle') return 'skip';
  if (error && autoRejoinState === 'triggered') return 'mark-failed';
  return null;
}

/** A manual join is over once it failed or the server seated us in this room. */
export function shouldResetManualJoin({
  manualJoinTriggered,
  error,
  isConnected,
  isCorrectRoom,
}: {
  manualJoinTriggered: boolean;
  error: string | null;
  isConnected: boolean;
  isCorrectRoom: boolean;
}): boolean {
  return manualJoinTriggered && (error !== null || (isConnected && isCorrectRoom));
}
