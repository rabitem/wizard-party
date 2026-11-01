import {
  canResolveMatch,
  computeStandings,
  findEntrant,
  getTournamentAward,
  getTournamentFormat,
  isFinalRound,
  isHost,
  matchLabel,
  matchResolvableAt,
  matchStaleAt,
  matchesOfRound,
  minimumEntrants,
  pendingMatchFor,
  roundLabel,
  type EntrantStatus,
  type MatchLiveState,
  type Standing,
  type Tournament,
  type TournamentFormatId,
  type TournamentHost,
  type TournamentMatch,
  type TournamentSettings,
  type TournamentStatus,
  type TournamentVisibility,
  type TrophyTier,
} from '../../../domain/tournament';
import type { ChampionRow, TournamentSummary, TrophyRecord, UserTournamentRow } from '../../ports/tournament';

/*
 * View models: the API response shapes of /api/tournaments/**. Built here (not in the routes) so
 * the rules of who may see what (invite codes, room codes, host controls) live in one tested place.
 */

export interface TournamentPlayerView {
  userId: string;
  username: string | null;
  displayName: string;
}

export interface TournamentSummaryView {
  id: string;
  name: string;
  description: string;
  format: TournamentFormatId;
  formatName: string;
  status: TournamentStatus;
  visibility: TournamentVisibility;
  host: TournamentHost;
  entrantCount: number;
  maxEntrants: number;
  maxTableSize: number;
  /** Rounds of a series; null for knockouts (they end when one table is left). */
  rounds: number | null;
  currentRound: number;
  startsAt: number | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  cancelledAt: number | null;
  champion: TournamentPlayerView | null;
}

export interface TournamentEntrantView extends TournamentPlayerView {
  level: number;
  seed: number;
  status: EntrantStatus;
  joinedAt: number;
  finalRank: number | null;
}

export interface TournamentSeatView {
  seat: number;
  /** null: a bot. */
  player: TournamentPlayerView | null;
}

export interface TournamentMatchResultView {
  outcome: 'played' | 'void';
  completedAt: number;
  players: { userId: string; placement: number; score: number; points: number; noShow: boolean; botTakeover: boolean }[];
}

export interface TournamentMatchView {
  id: string;
  round: number;
  table: number;
  status: 'pending' | 'completed' | 'void';
  seats: TournamentSeatView[];
  createdAt: number;
  deadlineAt: number;
  /** From then on the match counts as overdue while it is pending. */
  staleAt: number;
  /**
   * From then on the host may resolve it while it is pending: overdue and quiet for
   * MATCH_ACTIVITY_GRACE_MS (later than staleAt while the table keeps reporting progress).
   */
  resolvableAt: number;
  /** How far the game got (round in play, last activity); pending tables only, null before the game started. */
  live: MatchLiveState | null;
  result: TournamentMatchResultView | null;
}

export interface TournamentRoundView {
  round: number;
  label: string;
  isFinal: boolean;
  matches: TournamentMatchView[];
}

export interface TournamentAwardView {
  awardId: string;
  name: string;
  description: string;
  icon: string;
  tier: TrophyTier;
  xp: number;
  player: TournamentPlayerView;
}

/** The viewer's own table while it is pending (room code only ever goes to its players). */
export interface MyMatchView {
  matchId: string;
  round: number;
  table: number;
  label: string;
  roomCode: string;
  deadlineAt: number;
}

export type RegistrationBlocker = 'sign_in' | 'closed' | 'full' | 'registered';

export interface TournamentViewerView {
  userId: string | null;
  isHost: boolean;
  isEntrant: boolean;
  entrantStatus: EntrantStatus | null;
  canRegister: boolean;
  /** Why canRegister is false (null when it is true). */
  registrationBlocker: RegistrationBlocker | null;
  canWithdraw: boolean;
  canEdit: boolean;
  canStart: boolean;
  canCancel: boolean;
  canInvite: boolean;
  myMatch: MyMatchView | null;
  /** Host only: pending matches that are stale, quiet and may be resolved now (see canResolveMatch). */
  resolvableMatchIds: string[];
}

export interface TournamentDetailView {
  tournament: TournamentSummaryView & {
    settings: TournamentSettings;
    /** Only for the host and entrants of a private tournament. */
    inviteCode: string | null;
    /** Rounds to expect for the current field (knockouts: if every table is played). */
    expectedRounds: number;
    minimumEntrants: number;
  };
  entrants: TournamentEntrantView[];
  rounds: TournamentRoundView[];
  standings: Standing[];
  awards: TournamentAwardView[];
  viewer: TournamentViewerView;
  serverTime: number;
}

export interface TournamentListPage {
  items: TournamentSummaryView[];
  nextCursor: string | null;
}

export interface MyTournamentView extends TournamentSummaryView {
  isHost: boolean;
  entry: UserTournamentRow['entry'];
}

export interface TrophyView extends TrophyRecord {
  name: string;
  description: string;
  icon: string;
}

export interface MyTournamentsView {
  /** Registration open. */
  upcoming: MyTournamentView[];
  live: MyTournamentView[];
  /** Completed or cancelled. */
  past: MyTournamentView[];
  trophies: TrophyView[];
}

export type ChampionView = ChampionRow;

const FORMER_PLAYER = 'Former player';

/** Domain aggregate -> list row; used by repositories that hold aggregates and by the views. */
export function summarizeTournament(tournament: Tournament): TournamentSummary {
  const champion = tournament.entrants.find((entrant) => entrant.final?.rank === 1) ?? null;
  return {
    id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    format: tournament.format,
    status: tournament.status,
    visibility: tournament.visibility,
    host: tournament.host,
    entrantCount: tournament.entrants.length,
    maxEntrants: tournament.settings.maxEntrants,
    maxTableSize: tournament.settings.maxTableSize,
    rounds: tournament.settings.rounds,
    currentRound: tournament.currentRound,
    startsAt: tournament.startsAt,
    createdAt: tournament.createdAt,
    startedAt: tournament.startedAt,
    completedAt: tournament.completedAt,
    cancelledAt: tournament.cancelledAt,
    champion: champion && tournament.status === 'completed' ? { userId: champion.userId, username: champion.username, displayName: champion.displayName } : null,
  };
}

export function toSummaryView(summary: TournamentSummary): TournamentSummaryView {
  return {
    ...summary,
    formatName: getTournamentFormat(summary.format).name,
    rounds: summary.format === 'series' ? summary.rounds : null,
  };
}

function playerOf(tournament: Tournament, userId: string): TournamentPlayerView {
  const entrant = findEntrant(tournament, userId);
  return entrant
    ? { userId, username: entrant.username, displayName: entrant.displayName }
    : { userId, username: null, displayName: FORMER_PLAYER };
}

function toMatchView(tournament: Tournament, match: TournamentMatch): TournamentMatchView {
  return {
    id: match.id,
    round: match.round,
    table: match.table,
    status: match.status,
    seats: match.seats.map((seat) => ({ seat: seat.seat, player: seat.userId === null ? null : playerOf(tournament, seat.userId) })),
    createdAt: match.createdAt,
    deadlineAt: match.deadlineAt,
    staleAt: matchStaleAt(match),
    resolvableAt: matchResolvableAt(match),
    live: match.status === 'pending' ? match.live : null,
    result: match.result && {
      outcome: match.result.outcome,
      completedAt: match.result.completedAt,
      players: match.result.players.map(({ userId, placement, score, points, noShow, botTakeover }) => ({ userId, placement, score, points, noShow, botTakeover })),
    },
  };
}

function toRounds(tournament: Tournament): TournamentRoundView[] {
  const rounds: TournamentRoundView[] = [];
  for (let round = 1; round <= tournament.currentRound; round++) {
    rounds.push({
      round,
      label: roundLabel(tournament, round),
      isFinal: isFinalRound(tournament, round),
      matches: matchesOfRound(tournament, round).map((match) => toMatchView(tournament, match)),
    });
  }
  return rounds;
}

function toAwards(tournament: Tournament): TournamentAwardView[] {
  return tournament.awards.flatMap((award) => {
    const definition = getTournamentAward(award.awardId);
    if (!definition) return [];
    return [{
      awardId: award.awardId,
      name: definition.name,
      description: definition.description,
      icon: definition.icon,
      tier: award.tier,
      xp: award.xp,
      player: playerOf(tournament, award.userId),
    }];
  });
}

function registrationBlocker(tournament: Tournament, viewerId: string | null): RegistrationBlocker | null {
  if (viewerId === null) return 'sign_in';
  if (findEntrant(tournament, viewerId)) return 'registered';
  if (tournament.status !== 'registration') return 'closed';
  if (tournament.entrants.length >= tournament.settings.maxEntrants) return 'full';
  return null;
}

function toViewer(tournament: Tournament, viewerId: string | null, now: number): TournamentViewerView {
  const host = isHost(tournament, viewerId);
  const entrant = findEntrant(tournament, viewerId);
  const open = tournament.status === 'registration';
  const active = open || tournament.status === 'running';
  const blocker = registrationBlocker(tournament, viewerId);
  const pending = viewerId === null ? null : pendingMatchFor(tournament, viewerId);
  return {
    userId: viewerId,
    isHost: host,
    isEntrant: entrant !== null,
    entrantStatus: entrant?.status ?? null,
    canRegister: blocker === null,
    registrationBlocker: blocker,
    canWithdraw: open && entrant !== null,
    canEdit: host && open,
    canStart: host && open && tournament.entrants.length >= minimumEntrants(tournament.settings),
    canCancel: host && active,
    canInvite: host && open,
    myMatch: pending && {
      matchId: pending.id,
      round: pending.round,
      table: pending.table,
      label: matchLabel(tournament, pending),
      roomCode: pending.roomCode,
      deadlineAt: pending.deadlineAt,
    },
    resolvableMatchIds: host ? tournament.matches.filter((match) => canResolveMatch(tournament, viewerId, match, now)).map((match) => match.id) : [],
  };
}

/** The full, viewer-aware tournament page. */
export function toDetailView(tournament: Tournament, viewerId: string | null, now: number): TournamentDetailView {
  const viewer = toViewer(tournament, viewerId, now);
  const format = getTournamentFormat(tournament.format);
  const fieldSize = Math.max(tournament.entrants.length, minimumEntrants(tournament.settings));
  return {
    tournament: {
      ...toSummaryView(summarizeTournament(tournament)),
      settings: tournament.settings,
      inviteCode: viewer.isHost || viewer.isEntrant ? tournament.inviteCode : null,
      expectedRounds: tournament.status === 'registration' ? format.expectedRounds(tournament.settings, fieldSize) : Math.max(tournament.currentRound, format.expectedRounds(tournament.settings, fieldSize)),
      minimumEntrants: minimumEntrants(tournament.settings),
    },
    entrants: [...tournament.entrants]
      .sort((a, b) => a.seed - b.seed)
      .map((entrant) => ({
        userId: entrant.userId,
        username: entrant.username,
        displayName: entrant.displayName,
        level: entrant.level,
        seed: entrant.seed,
        status: entrant.status,
        joinedAt: entrant.joinedAt,
        finalRank: entrant.final?.rank ?? null,
      })),
    rounds: toRounds(tournament),
    standings: tournament.status === 'registration' ? [] : computeStandings(tournament),
    awards: toAwards(tournament),
    viewer,
    serverTime: now,
  };
}

export function toTrophyView(record: TrophyRecord): TrophyView | null {
  const definition = getTournamentAward(record.awardId);
  return definition ? { ...record, name: definition.name, description: definition.description, icon: definition.icon } : null;
}

export function toMyTournamentView(row: UserTournamentRow): MyTournamentView {
  return { ...toSummaryView(row.summary), isHost: row.isHost, entry: row.entry };
}
