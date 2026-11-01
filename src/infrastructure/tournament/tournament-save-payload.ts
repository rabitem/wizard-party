import type {
  Entrant,
  EntrantStatus,
  MatchPlayerResult,
  MatchStatus,
  Tournament,
  TournamentAward,
  TournamentFormatId,
  TournamentMatch,
  TournamentSettings,
  TournamentStatus,
  TournamentVisibility,
} from '@shared/domain/tournament';
import type { RoundResult } from '@shared/domain/account';

/*
 * The aggregate as the one jsonb parameter of the save statements (postgres-tournament-repository.ts
 * reads it with jsonb_array_elements). Timestamps travel as ISO strings, which keeps millisecond
 * values exact. Free of I/O; the round trip through the rows is tested in tournament-rows.test.ts.
 */

const iso = (ms: number): string => new Date(ms).toISOString();
const optionalIso = (ms: number | null): string | null => (ms === null ? null : iso(ms));

export interface TournamentSavePayload {
  tournament: {
    id: string;
    name: string;
    description: string;
    hostUserId: string | null;
    hostUsername: string | null;
    hostDisplayName: string;
    format: TournamentFormatId;
    settings: TournamentSettings;
    maxEntrants: number;
    visibility: TournamentVisibility;
    inviteCode: string | null;
    startsAt: string | null;
    status: TournamentStatus;
    currentRound: number;
    version: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  entrants: {
    userId: string;
    username: string | null;
    displayName: string;
    level: number;
    seed: number;
    status: EntrantStatus;
    joinedAt: string;
    final: Entrant['final'];
  }[];
  matches: {
    id: string;
    round: number;
    table: number;
    roomCode: string;
    seats: TournamentMatch['seats'];
    status: MatchStatus;
    createdAt: string;
    deadlineAt: string;
    outcome: 'played' | 'void' | null;
    gameId: string | null;
    completedAt: string | null;
    /** Live state; null until the worker reported the game. */
    live: { round: number; maxRounds: number; lastActivityAt: string } | null;
  }[];
  results: (Omit<MatchPlayerResult, 'rounds'> & { matchId: string; rounds: readonly RoundResult[] })[];
  awards: (Omit<TournamentAward, 'awardedAt'> & { awardedAt: string })[];
}

export interface SavePayloadOptions {
  /**
   * Parts known to be stored unchanged (the very objects the repository loaded; the aggregate is
   * immutable, so a changed part is always a new object). They are left out of the payload, which
   * keeps a result report of a long tournament from rewriting every earlier table.
   */
  isPersisted?: (part: object) => boolean;
}

export function toSavePayload(tournament: Tournament, { isPersisted = () => false }: SavePayloadOptions = {}): TournamentSavePayload {
  const changedMatches = tournament.matches.filter((match) => !isPersisted(match));
  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      hostUserId: tournament.host.userId,
      hostUsername: tournament.host.username,
      hostDisplayName: tournament.host.displayName,
      format: tournament.format,
      settings: tournament.settings,
      maxEntrants: tournament.settings.maxEntrants,
      visibility: tournament.visibility,
      inviteCode: tournament.inviteCode,
      startsAt: optionalIso(tournament.startsAt),
      status: tournament.status,
      currentRound: tournament.currentRound,
      version: tournament.version,
      createdAt: iso(tournament.createdAt),
      startedAt: optionalIso(tournament.startedAt),
      completedAt: optionalIso(tournament.completedAt),
      cancelledAt: optionalIso(tournament.cancelledAt),
    },
    // Entrants are always written in full (at most 64 small rows): withdrawals delete the rest.
    entrants: tournament.entrants.map((entrant) => ({
      userId: entrant.userId,
      username: entrant.username,
      displayName: entrant.displayName,
      level: entrant.level,
      seed: entrant.seed,
      status: entrant.status,
      joinedAt: iso(entrant.joinedAt),
      final: entrant.final,
    })),
    matches: changedMatches.map((match) => ({
      id: match.id,
      round: match.round,
      table: match.table,
      roomCode: match.roomCode,
      seats: match.seats,
      status: match.status,
      createdAt: iso(match.createdAt),
      deadlineAt: iso(match.deadlineAt),
      outcome: match.result?.outcome ?? null,
      gameId: match.result?.gameId ?? null,
      completedAt: optionalIso(match.result?.completedAt ?? null),
      live: match.live && { round: match.live.round, maxRounds: match.live.maxRounds, lastActivityAt: iso(match.live.lastActivityAt) },
    })),
    results: changedMatches.flatMap((match) =>
      match.status === 'pending' || !match.result ? [] : match.result.players.map((player) => ({ matchId: match.id, ...player }))
    ),
    awards: tournament.awards.filter((award) => !isPersisted(award)).map((award) => ({ ...award, awardedAt: iso(award.awardedAt) })),
  };
}
