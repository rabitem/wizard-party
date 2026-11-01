import type { GameResult } from '@shared/domain/account';

import { loadPlayerStats, recordGameResult } from '@/lib/player-stats';

/**
 * Where finished games go. Guests keep them in this browser; signed-in players send them to
 * their account. The game code only ever calls `recordFinishedGame`.
 */
export interface GameResultSink {
  record(result: GameResult): void;
}

export const guestStatsSink: GameResultSink = {
  record(result) {
    const rounds = result.rounds.map((round, index) => ({ roundNumber: index + 1, cardsInHand: index + 1, ...round }));
    recordGameResult(loadPlayerStats(), result.placement, result.score, result.playerCount, rounds, result.clientGameId);
  },
};

let activeSink: GameResultSink = guestStatsSink;

export function setGameResultSink(sink: GameResultSink | null): void {
  activeSink = sink ?? guestStatsSink;
}

export function recordFinishedGame(result: GameResult): void {
  activeSink.record(result);
}

export function newClientGameId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
