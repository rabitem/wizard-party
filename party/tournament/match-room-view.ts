import type { Game } from '../../shared/domain';
import type { TournamentMatchRoomState } from '../../shared/domain/tournament';
import { matchDeadline, noShowDeadline, type TournamentMatchRecord } from './match-record';
import { isSeatOccupied } from './match-schedule';

/**
 * What the players at the table see of the match lock (lobby banner, waiting roster, countdowns).
 * Built from names only: account ids never leave the worker.
 */
export function toMatchRoomState(record: TournamentMatchRecord, game: Game): TournamentMatchRoomState {
  return {
    tournamentId: record.tid,
    matchId: record.mid,
    label: record.match.label,
    round: record.match.round,
    table: record.match.table,
    roster: record.seats.map((seat) => ({
      name: seat.name,
      seat: seat.seat,
      joined: isSeatOccupied(game, seat),
      noShow: seat.noShow,
    })),
    bots: record.match.bots,
    autoStartAt: record.startedAt === null ? record.autoStartAt : null,
    noShowDeadlineAt: noShowDeadline(record),
    reported: record.reportedAt !== null,
    reportOutcome: record.reportOutcome,
    deadlineAt: matchDeadline(record),
    expired: record.expiredAt !== null,
  };
}

/**
 * The fields a match room adds to every GAME_STATE message: `tournamentMatch` next to `state`
 * (the client reads it from the message). Casual rooms add nothing.
 */
export function tournamentMatchPayload(
  tournamentMatch: TournamentMatchRoomState | null
): { tournamentMatch?: TournamentMatchRoomState } {
  return tournamentMatch ? { tournamentMatch } : {};
}

/** Public room info (`GET /parties/main/<room>`) of a tournament room. */
export interface TournamentRoomInfo {
  roomId: string;
  playerCount: number;
  phase: string;
  /** Tournament rooms never take casual players. */
  isAvailable: false;
  maxPlayers: number;
  roomName: string;
  /** Only the caption; no ids, roster or secrets. Null while no match has locked the room. */
  tournament: { label: string } | null;
}

export function tournamentRoomInfo(
  base: { roomId: string; playerCount: number; phase: string; maxPlayers: number; roomName: string },
  record: TournamentMatchRecord | null
): TournamentRoomInfo {
  return {
    ...base,
    isAvailable: false,
    roomName: record ? record.match.label : base.roomName,
    tournament: record ? { label: record.match.label } : null,
  };
}
