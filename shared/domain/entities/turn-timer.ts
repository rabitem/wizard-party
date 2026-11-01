/**
 * Turn Timer
 *
 * The countdown for the player whose decision the game waits for. Once it
 * expires, other players may heckle that player with a timeout sound. The game
 * says who is timed (a TurnTimerTarget); this collaborator keeps the state.
 */

import { GamePhase } from '../value-objects/game-phase';
import {
  type IRulesetConfig,
  TURN_TIMER_LIMITS,
  ensureRulesetConfig,
} from '../value-objects/ruleset-config';
import type { ITurnTimerState } from './game.types';

const MS_PER_SECOND = 1000;

const TIMED_PHASES: ReadonlySet<GamePhase> = new Set([
  GamePhase.TRUMP_SELECTION,
  GamePhase.BIDDING,
  GamePhase.PLAYING,
]);

/** The player and phase a timer runs for. */
export interface TurnTimerTarget {
  playerId: string;
  playerName: string;
  phase: GamePhase;
  durationMs: number;
}

/**
 * Timer length for a phase under the ruleset, or null when the phase is untimed.
 */
export function getTurnTimerDurationMs(rulesetConfig: IRulesetConfig, phase: GamePhase): number | null {
  if (!TIMED_PHASES.has(phase)) return null;
  const turnRules = ensureRulesetConfig(rulesetConfig).turn;
  const seconds = phase === GamePhase.PLAYING ? turnRules.playTimerSeconds : turnRules.biddingTimerSeconds;
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const wholeSeconds = Math.trunc(seconds);
  if (wholeSeconds < TURN_TIMER_LIMITS.MIN_SECONDS || wholeSeconds > TURN_TIMER_LIMITS.MAX_SECONDS) {
    return null;
  }
  return wholeSeconds * MS_PER_SECOND;
}

export class TurnTimer {
  public state: ITurnTimerState | null = null;
  private sequence = 0;

  clear(): void {
    this.state = null;
  }

  /** Start a fresh countdown for the target (or stop the timer when there is none). */
  restart(target: TurnTimerTarget | null, now: number): void {
    if (!target) {
      this.clear();
      return;
    }
    this.sequence += 1;
    this.state = {
      playerId: target.playerId,
      playerName: target.playerName,
      phase: target.phase,
      startedAt: now,
      durationMs: target.durationMs,
      expiresAt: now + target.durationMs,
      expired: false,
      sequence: this.sequence,
    };
  }

  /** Keep a running countdown for the same target; restart it otherwise. */
  sync(target: TurnTimerTarget | null, now: number): void {
    if (
      target &&
      this.state?.playerId === target.playerId &&
      this.state.phase === target.phase &&
      this.state.durationMs === target.durationMs
    ) {
      return;
    }
    this.restart(target, now);
  }

  /** Mark the countdown expired once its time is up; returns it only on that change. */
  expire(now: number): ITurnTimerState | null {
    if (!this.state || this.state.expired || now < this.state.expiresAt) return null;
    this.state = { ...this.state, expired: true };
    return this.state;
  }

  remaining(now: number): number {
    if (!this.state || this.state.expired) return 0;
    return Math.max(0, this.state.expiresAt - now);
  }

  restore(state: ITurnTimerState | null | undefined): void {
    this.state = state ? { ...state } : null;
    this.sequence = this.state?.sequence ?? 0;
  }
}
