import 'server-only';

import type { ICompletedGameFactsReader } from '@shared/application/ports/stats';
import type { CompletedGameFacts, CompletedRoundResult } from '@shared/domain/stats';

import { getSql } from '../db/neon';

interface CompletedGameRow {
  max_rounds: number;
  completed: { winnerId: string; standings: { playerId: string; score: number }[] } | null;
  rounds: CompletedRoundResult[][];
  cards: number;
  wizards: number;
  jesters: number;
}

/** One round trip over the telemetry event log of a single game (indexed by game_id, seq). */
export class PostgresCompletedGameReader implements ICompletedGameFactsReader {
  async read(gameId: string): Promise<CompletedGameFacts | null> {
    const rows = (await getSql()`
      SELECT
        g.max_rounds,
        (SELECT e.payload FROM telemetry_events e
          WHERE e.game_id = g.game_id AND e.type = 'game.completed' LIMIT 1) AS completed,
        (SELECT coalesce(jsonb_agg(e.payload -> 'results' ORDER BY e.seq), '[]'::jsonb) FROM telemetry_events e
          WHERE e.game_id = g.game_id AND e.type = 'round.completed') AS rounds,
        count(c.event_id) AS cards,
        count(c.event_id) FILTER (WHERE c.payload -> 'card' ->> 'type' = 'WIZARD') AS wizards,
        count(c.event_id) FILTER (WHERE c.payload -> 'card' ->> 'type' = 'JESTER') AS jesters
      FROM games g
      LEFT JOIN telemetry_events c ON c.game_id = g.game_id AND c.type = 'card.played'
      WHERE g.game_id = ${gameId}::uuid
      GROUP BY g.game_id, g.max_rounds
    `) as CompletedGameRow[];
    const row = rows[0];
    if (!row?.completed) return null;
    return {
      maxRounds: Number(row.max_rounds),
      winnerId: row.completed.winnerId,
      finalScores: row.completed.standings.map(({ playerId, score }) => ({ playerId, score })),
      rounds: row.rounds,
      cards: { total: Number(row.cards), wizards: Number(row.wizards), jesters: Number(row.jesters) },
    };
  }
}
