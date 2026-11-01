/**
 * Game pause (value object helpers)
 *
 * A pause is orthogonal to the phase: while the table waits for a disconnected player the game
 * stays in the phase it was in (hands, the open trick and its collection stay on the table) and
 * carries a pause state beside it: who it waits for and until when.
 *
 * Two wire forms exist while clients and servers of different releases coexist:
 * - orthogonal (protocol 2 and later): `phase` is the real phase, `pauseState` is set;
 * - legacy (protocol 1): `phase` is PAUSED and the real phase is `pauseState.previousPhase`.
 * These helpers read both, so no consumer switches on PAUSED itself.
 */

import { GamePhase } from './game-phase';

/** The part of a pause state these helpers read (IPauseState satisfies it). */
export interface PauseLike {
  pausedForPlayerId: string;
  pausedAt: number;
  timeoutDuration: number;
  /** The phase the game is in while paused (legacy clients read it as the phase to resume). */
  previousPhase: GamePhase;
}

/** A game snapshot as far as pausing is concerned (IGameState satisfies it). */
export interface PausableState {
  phase: GamePhase;
  pauseState?: PauseLike | null;
}

/** True while the game waits for a disconnected player (either wire form). */
export function isGamePaused(state: PausableState): boolean {
  return Boolean(state.pauseState) || state.phase === GamePhase.PAUSED;
}

/**
 * The phase the table is in, also while paused. Renderers, legality and sounds read this, so a
 * pause freezes the table instead of unmounting it.
 */
export function getDisplayPhase(state: PausableState): GamePhase {
  if (state.phase !== GamePhase.PAUSED) return state.phase;
  return state.pauseState?.previousPhase ?? GamePhase.PAUSED;
}

/** When a pause runs out (ms since epoch), or null when the game is not paused. */
export function getPauseDeadline(pause: PauseLike | null | undefined): number | null {
  return pause ? pause.pausedAt + pause.timeoutDuration : null;
}

/** A snapshot in the orthogonal form (legacy PAUSED snapshots get their real phase back). */
export function toOrthogonalPause<T extends PausableState>(state: T): T {
  const pause: PauseLike | null | undefined = state.pauseState;
  if (state.phase !== GamePhase.PAUSED || !pause) return state;
  return { ...state, phase: pause.previousPhase };
}

/** A snapshot in the legacy form, for protocol-1 clients (phase PAUSED while paused). */
export function toLegacyPause<T extends PausableState>(state: T): T {
  const pause: PauseLike | null | undefined = state.pauseState;
  if (!pause || state.phase === GamePhase.PAUSED) return state;
  // The spread keeps every field of the full pause state (IPauseState also names the player).
  return { ...state, phase: GamePhase.PAUSED, pauseState: { ...pause, previousPhase: state.phase } };
}
