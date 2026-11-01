import type { Game } from '../../shared/domain';
import { rankMatchSeats } from '../../shared/domain/tournament';
import {
  MATCH_PROGRESS_KIND,
  TOURNAMENT_WIRE_VERSION,
  type MatchProgressReport,
  type MatchResultReport,
  type MatchResultStanding,
} from '../../shared/tournament';
import { matchTableSize, type TournamentMatchRecord } from './match-record';
import { seatPlayer } from './match-schedule';

/*
 * The worker's attested result of a match: placements over every seat (bots included, no-shows
 * last, via the domain's rankMatchSeats), final scores and per-round bids of the roster members.
 * Bots are never reported. Plus the progress pings sent while the match is played.
 */

/** The worker's id of the game played in a match room (one game per room). */
export function matchGameId(record: Pick<TournamentMatchRecord, 'room' | 'startedAt'>): string {
  return `${record.room}:${record.startedAt ?? 0}`;
}

function noShowStanding(uid: string, tableSize: number, botTakeover = false): MatchResultStanding {
  return { uid, placement: tableSize, score: 0, rounds: [], noShow: true, botTakeover };
}

export function buildMatchResultReport(record: TournamentMatchRecord, game: Game, completedAt: number): MatchResultReport {
  const noShowPlayerIds = new Set(
    record.seats.filter((seat) => seat.noShow && seat.playerId !== null).map((seat) => seat.playerId)
  );
  const placements = rankMatchSeats(
    game.players.map((player) => ({ id: player.id, score: player.score, noShow: noShowPlayerIds.has(player.id) }))
  );
  const tableSize = Math.max(game.players.length, matchTableSize(record));

  const standings = record.seats.map((seat): MatchResultStanding => {
    const player = seatPlayer(game, seat);
    const placement = player ? placements.get(player.id) : undefined;
    if (seat.noShow || !player || placement === undefined) return noShowStanding(seat.uid, tableSize, seat.botTakeover);
    return {
      uid: seat.uid,
      placement,
      score: player.score,
      rounds: player.roundHistory.map((round) => ({ bid: round.bid, tricksWon: round.tricksWon, roundScore: round.score })),
      noShow: false,
      botTakeover: seat.botTakeover,
    };
  });

  return { v: TOURNAMENT_WIRE_VERSION, tid: record.tid, mid: record.mid, room: record.room, gameId: matchGameId(record), completedAt, standings };
}

/** Nobody was seated when the match had to start: every member forfeits without a game. */
export function buildForfeitReport(record: TournamentMatchRecord, completedAt: number): MatchResultReport {
  const tableSize = matchTableSize(record);
  return {
    v: TOURNAMENT_WIRE_VERSION,
    tid: record.tid,
    mid: record.mid,
    room: record.room,
    gameId: matchGameId(record),
    completedAt,
    standings: record.seats.map((seat) => noShowStanding(seat.uid, tableSize)),
  };
}

/**
 * Proof of life of a match in play, sent at the start and at every round end: the round in play
 * (round r + 1 once round r ended; never beyond the last round) and when.
 */
export function buildMatchProgressReport(
  record: TournamentMatchRecord,
  progress: { round: number; maxRounds: number },
  at: number
): MatchProgressReport {
  const maxRounds = Math.max(1, progress.maxRounds);
  const round = Math.min(Math.max(1, progress.round), maxRounds);
  return { v: TOURNAMENT_WIRE_VERSION, kind: MATCH_PROGRESS_KIND, tid: record.tid, mid: record.mid, room: record.room, gameId: matchGameId(record), round, maxRounds, at };
}
