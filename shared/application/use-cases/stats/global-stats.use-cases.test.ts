import { describe, expect, it } from 'vitest';

import type { CompletedGameFacts, GameStatsContribution } from '../../../domain/stats/global-stats';
import { TelemetryEventType, type AnyTelemetryEnvelope } from '../../../telemetry';
import type { ICompletedGameFactsReader, IGlobalStatsStore } from '../../ports/stats/global-stats.port';
import { GetGlobalStatsUseCase, RecordCompletedGamesUseCase } from './global-stats.use-cases';

const FACTS: CompletedGameFacts = {
  maxRounds: 2,
  winnerId: 'a',
  finalScores: [{ playerId: 'a', score: 50 }, { playerId: 'b', score: 10 }],
  rounds: [
    [{ playerId: 'a', bid: 1, tricksWon: 1, totalScore: 30 }, { playerId: 'b', bid: 1, tricksWon: 0, totalScore: -10 }],
    [{ playerId: 'a', bid: 0, tricksWon: 0, totalScore: 50 }, { playerId: 'b', bid: 1, tricksWon: 2, totalScore: 10 }],
  ],
  cards: { total: 6, wizards: 1, jesters: 0 },
};

function envelope(type: TelemetryEventType, gameId: string | null, payload: unknown): AnyTelemetryEnvelope {
  return {
    schemaVersion: 1,
    eventId: `${type}-${gameId}`,
    type,
    occurredAt: 0,
    roomId: 'room',
    gameId,
    seq: 1,
    source: 'system',
    actorId: null,
    correlationId: 'c',
    commandType: null,
    round: null,
    phase: 'game_end',
    serverVersion: null,
    payload,
  } as unknown as AnyTelemetryEnvelope;
}

const completed = (gameId: string) =>
  envelope(TelemetryEventType.GAME_COMPLETED, gameId, { winnerId: 'a', durationMs: 1, standings: [{ playerId: 'a', score: 50, rank: 1 }] });

/** Records once per game id, like the Redis store. */
function memoryStore(initial: Record<string, unknown> | null = {}) {
  const recorded = new Map<string, GameStatsContribution>();
  const store: IGlobalStatsStore = {
    async read() {
      return initial;
    },
    async record(gameId, contribution) {
      if (recorded.has(gameId)) return false;
      recorded.set(gameId, contribution);
      return true;
    },
  };
  return { store, recorded };
}

const reader = (games: Record<string, CompletedGameFacts>): ICompletedGameFactsReader => ({
  async read(gameId) {
    return games[gameId] ?? null;
  },
});

describe('RecordCompletedGamesUseCase', () => {
  it('should record each game the batch completes from the server facts', async () => {
    const { store, recorded } = memoryStore();
    const useCase = new RecordCompletedGamesUseCase(reader({ g1: FACTS }), store);

    const result = await useCase.execute([
      envelope(TelemetryEventType.CHAT_SENT, 'g1', { playerId: 'a', message: 'gg', length: 2 }),
      completed('g1'),
    ]);

    expect(result).toEqual({ recorded: 1 });
    expect(recorded.get('g1')).toEqual({
      roundsPlayed: 2,
      wizardsPlayed: 1,
      jestersPlayed: 0,
      cardsPlayed: 6,
      tricksPlayed: 3,
      perfectBids: 2,
      totalBids: 4,
      highestScore: 50,
      hadComeback: false,
    });
  });

  it('should count a redelivered batch only once', async () => {
    const { store, recorded } = memoryStore();
    const useCase = new RecordCompletedGamesUseCase(reader({ g1: FACTS }), store);

    await useCase.execute([completed('g1')]);
    const again = await useCase.execute([completed('g1'), completed('g1')]);

    expect(again).toEqual({ recorded: 0 });
    expect(recorded.size).toBe(1);
  });

  it('should skip games the server has no record of and batches without a completed game', async () => {
    const { store, recorded } = memoryStore();
    const useCase = new RecordCompletedGamesUseCase(reader({}), store);

    expect(await useCase.execute([completed('unknown')])).toEqual({ recorded: 0 });
    expect(await useCase.execute([envelope(TelemetryEventType.GAME_ABANDONED, 'g2', { reason: 'empty', durationMs: 1 })])).toEqual({ recorded: 0 });
    expect(recorded.size).toBe(0);
  });
});

describe('GetGlobalStatsUseCase', () => {
  it('should return sanitized totals', async () => {
    const { store } = memoryStore({ gamesPlayed: '4', highestScore: 120.5, perfectBids: -2 });
    expect(await new GetGlobalStatsUseCase(store).execute()).toMatchObject({ gamesPlayed: 4, highestScore: 120, perfectBids: 0, cardsPlayed: 0 });
  });

  it('should return null without a configured store', async () => {
    const { store } = memoryStore(null);
    expect(await new GetGlobalStatsUseCase(store).execute()).toBeNull();
  });
});
