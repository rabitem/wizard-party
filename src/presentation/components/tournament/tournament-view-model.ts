import type {
  TournamentMatchView,
  TournamentRoundView,
  TournamentSummaryView,
  TournamentViewerView,
} from '@shared/application/use-cases/tournament';
import { countNonDefaultRules } from '@shared/domain/value-objects/ruleset-validation';
import {
  TOURNAMENT_LIMITS,
  advanceCount,
  getTournamentFormat,
  planSeating,
  type TableSeating,
  type TournamentFormatId,
  type TournamentSettings,
  type TournamentStatus,
} from '@shared/domain/tournament';

import { BOT_DIFFICULTY_OPTIONS, TOURNAMENT_ROUTES, TOURNAMENT_UI } from '@/presentation/config/tournament.config';

import { ordinal } from '../account/public/public-profile-format';

/*
 * Pure view-model helpers of the tournament pages: everything the components show that needs a
 * decision (labels, ordering, who advanced, which button to offer) lives here, unit tested, so
 * the components stay declarative.
 */

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const PERCENT = 100;

// ---------------------------------------------------------------------------------------------
// Status and time
// ---------------------------------------------------------------------------------------------

export type StatusTone = 'open' | 'live' | 'done' | 'cancelled';

const STATUS: Record<TournamentStatus, { label: string; tone: StatusTone }> = {
  registration: { label: 'Registration open', tone: 'open' },
  running: { label: 'Live', tone: 'live' },
  completed: { label: 'Finished', tone: 'done' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

export function statusPresentation(status: TournamentStatus): { label: string; tone: StatusTone } {
  return STATUS[status];
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Compact remaining time: "2d 3h", "3h 05m", "4:05" (never negative). */
export function formatDuration(ms: number): string {
  const total = Math.max(0, ms);
  if (total >= MS_PER_DAY) {
    return `${Math.floor(total / MS_PER_DAY)}d ${Math.floor((total % MS_PER_DAY) / MS_PER_HOUR)}h`;
  }
  if (total >= MS_PER_HOUR) {
    return `${Math.floor(total / MS_PER_HOUR)}h ${pad(Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE))}m`;
  }
  const seconds = Math.ceil(total / MS_PER_SECOND);
  return `${Math.floor(seconds / SECONDS_PER_MINUTE)}:${pad(seconds % SECONDS_PER_MINUTE)}`;
}

/** Absolute date in the viewer's locale, e.g. "28 Oct 2026, 18:30". */
export function formatDateTime(epochMs: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(epochMs);
}

type ScheduleSource = Pick<TournamentSummaryView, 'status' | 'startsAt' | 'currentRound' | 'rounds' | 'completedAt' | 'cancelledAt'>;

/** One line about when things happen: scheduled start, current round, or when it ended. */
export function scheduleLine(summary: ScheduleSource, now: number, locale?: string): string {
  switch (summary.status) {
    case 'registration': {
      if (summary.startsAt === null) return 'Starts when the host is ready';
      const remaining = summary.startsAt - now;
      if (remaining <= 0) return 'Starting now';
      if (remaining <= TOURNAMENT_UI.COUNTDOWN_THRESHOLD_MS) return `Starts in ${formatDuration(remaining)}`;
      return `Starts ${formatDateTime(summary.startsAt, locale)}`;
    }
    case 'running':
      return summary.rounds === null ? `Round ${summary.currentRound}` : `Round ${summary.currentRound} of ${summary.rounds}`;
    case 'completed':
      return summary.completedAt === null ? 'Finished' : `Finished ${formatDateTime(summary.completedAt, locale)}`;
    case 'cancelled':
      return summary.cancelledAt === null ? 'Cancelled' : `Cancelled ${formatDateTime(summary.cancelledAt, locale)}`;
  }
}

export function fieldLabel(summary: Pick<TournamentSummaryView, 'entrantCount' | 'maxEntrants'>): string {
  return `${summary.entrantCount}/${summary.maxEntrants} players`;
}

/** Share of the field taken, 0..1 (for the fill bar). */
export function fieldFill(summary: Pick<TournamentSummaryView, 'entrantCount' | 'maxEntrants'>): number {
  return summary.maxEntrants <= 0 ? 0 : Math.min(1, summary.entrantCount / summary.maxEntrants);
}

// ---------------------------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------------------------

export function botDifficultyLabel(difficulty: number): string {
  return BOT_DIFFICULTY_OPTIONS.find((option) => option.value === difficulty)?.label ?? 'Bots';
}

export function tableSizeLabel(maxTableSize: number): string {
  const min = TOURNAMENT_LIMITS.MIN_TABLE_SIZE;
  return maxTableSize <= min ? `Tables of ${min}` : `Tables of ${min}–${maxTableSize}`;
}

export function advanceLabel(advancePerTable: number | null): string {
  if (advancePerTable === null) return 'Top half of each table advances';
  return advancePerTable === 1 ? 'Table winners advance' : `Top ${advancePerTable} of each table advance`;
}

/** "1 round" / "3 rounds". */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Short facts about the setup, shown as chips under the title. */
export function settingsChips(format: TournamentFormatId, settings: TournamentSettings): string[] {
  const chips = [getTournamentFormat(format).name, tableSizeLabel(settings.maxTableSize)];
  if (format === 'series') chips.push(countLabel(settings.rounds, 'round'));
  if (format === 'knockout') chips.push(advanceLabel(settings.advancePerTable));
  if (settings.fillWithBots) chips.push(`Bots fill tables (${botDifficultyLabel(settings.botDifficulty)})`);
  const customRules = countNonDefaultRules(settings.rulesetConfig);
  chips.push(customRules === 0 ? 'Standard rules' : countLabel(customRules, 'custom rule'));
  return chips;
}

export interface StructurePreview {
  /** Tables of round 1, or null when the field can't be seated. */
  tables: TableSeating[] | null;
  rounds: number;
  /** Why the field can't be seated (only without bots). */
  problem: string | null;
}

/** How a field of `entrants` would be seated in round 1 and how many rounds it plays. */
export function previewStructure(format: TournamentFormatId, settings: TournamentSettings, entrants: number): StructurePreview {
  const strategy = getTournamentFormat(format);
  try {
    const tables = planSeating(entrants, settings.maxTableSize, settings.fillWithBots);
    return { tables, rounds: strategy.expectedRounds(settings, entrants), problem: null };
  } catch (error) {
    return { tables: null, rounds: 0, problem: error instanceof Error ? error.message : 'This field cannot be seated.' };
  }
}

/** "4 tables · 3×4 + 1×5"-style summary of a seating plan. */
export function describeSeating(tables: readonly TableSeating[]): string {
  const sizes = new Map<number, number>();
  let bots = 0;
  for (const table of tables) {
    const size = table.humans + table.bots;
    sizes.set(size, (sizes.get(size) ?? 0) + 1);
    bots += table.bots;
  }
  const parts = [...sizes.entries()].sort((a, b) => b[0] - a[0]).map(([size, count]) => `${count}×${size}`);
  const botNote = bots === 0 ? '' : ` · ${countLabel(bots, 'bot')}`;
  return `${countLabel(tables.length, 'table')} (${parts.join(' + ')} seats)${botNote}`;
}

// ---------------------------------------------------------------------------------------------
// Tables, rounds and bracket
// ---------------------------------------------------------------------------------------------

export interface TableRow {
  key: string;
  userId: string | null;
  displayName: string;
  username: string | null;
  isBot: boolean;
  isViewer: boolean;
  placement: number | null;
  score: number | null;
  points: number | null;
  noShow: boolean;
  botTakeover: boolean;
  /** Knockout: sits at a table of the next round. */
  advanced: boolean;
}

const BOT_NAME = 'Bot';

/**
 * Seats of a table as rows: by placement once played (ties keep seat order), by seat before.
 * `advancers`: players seated in the next round (knockout).
 */
export function tableRows(match: TournamentMatchView, viewerId: string | null, advancers: ReadonlySet<string> = new Set()): TableRow[] {
  const results = new Map((match.result?.players ?? []).map((player) => [player.userId, player]));
  const rows = match.seats.map((seat): TableRow & { seat: number } => {
    const player = seat.player;
    const result = player ? results.get(player.userId) : undefined;
    return {
      key: player ? player.userId : `bot-${seat.seat}`,
      seat: seat.seat,
      userId: player?.userId ?? null,
      displayName: player?.displayName ?? BOT_NAME,
      username: player?.username ?? null,
      isBot: player === null,
      isViewer: player !== null && player.userId === viewerId,
      placement: result?.placement ?? null,
      score: result?.score ?? null,
      points: result?.points ?? null,
      noShow: result?.noShow ?? false,
      botTakeover: result?.botTakeover ?? false,
      advanced: player !== null && advancers.has(player.userId),
    };
  });
  const placed = match.result !== null;
  rows.sort((a, b) => {
    if (placed) {
      // Bots have no reported placement; they go after the humans.
      const byPlacement = (a.placement ?? Number.MAX_SAFE_INTEGER) - (b.placement ?? Number.MAX_SAFE_INTEGER);
      if (byPlacement !== 0) return byPlacement;
    }
    return a.seat - b.seat;
  });
  return rows.map(({ seat: _seat, ...row }) => row);
}

/** Players seated in a round (who advanced into it, for knockouts). */
export function playersOfRound(round: TournamentRoundView | undefined): Set<string> {
  const players = new Set<string>();
  for (const match of round?.matches ?? []) {
    for (const seat of match.seats) if (seat.player) players.add(seat.player.userId);
  }
  return players;
}

export interface RoundProgress {
  played: number;
  total: number;
  complete: boolean;
}

export function roundProgress(round: TournamentRoundView): RoundProgress {
  const played = round.matches.filter((match) => match.status !== 'pending').length;
  return { played, total: round.matches.length, complete: played === round.matches.length };
}

export interface BracketColumn {
  round: number;
  label: string;
  isFinal: boolean;
  progress: RoundProgress;
  /** Expected but not yet seated (placeholder column). */
  upcoming: boolean;
  matches: { match: TournamentMatchView; rows: TableRow[] }[];
}

/** Knockout bracket: one column per round, plus placeholder columns for rounds still to come. */
export function bracketColumns(rounds: readonly TournamentRoundView[], expectedRounds: number, viewerId: string | null): BracketColumn[] {
  const columns: BracketColumn[] = rounds.map((round, index) => {
    const next = rounds[index + 1];
    const advancers = playersOfRound(next);
    return {
      round: round.round,
      label: round.label,
      isFinal: round.isFinal,
      progress: roundProgress(round),
      upcoming: false,
      matches: round.matches.map((match) => ({ match, rows: tableRows(match, viewerId, advancers) })),
    };
  });
  const lastSeated = rounds[rounds.length - 1];
  if (lastSeated?.isFinal) return columns;
  for (let round = rounds.length + 1; round <= expectedRounds; round++) {
    columns.push({
      round,
      label: round === expectedRounds ? 'Final' : `Round ${round}`,
      isFinal: round === expectedRounds,
      progress: { played: 0, total: 0, complete: false },
      upcoming: true,
      matches: [],
    });
  }
  return columns;
}

/** Knockout: how many of a table's humans advance (for the caption under a pending table). */
export function advancingAt(match: TournamentMatchView, advancePerTable: number | null): number {
  return advanceCount(match.seats.filter((seat) => seat.player !== null).length, advancePerTable);
}

/** The round tab a series view opens on: the viewer's pending table, else the latest round. */
export function defaultRoundTab(rounds: readonly TournamentRoundView[], viewer: Pick<TournamentViewerView, 'myMatch'>): number | null {
  if (rounds.length === 0) return null;
  return viewer.myMatch?.round ?? rounds[rounds.length - 1].round;
}

// ---------------------------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------------------------

export function formatAccuracy(accuracy: number | null): string {
  return accuracy === null ? '—' : `${Math.round(accuracy * PERCENT)}%`;
}

// ---------------------------------------------------------------------------------------------
// Viewer actions
// ---------------------------------------------------------------------------------------------

export type RegistrationAction =
  | { kind: 'register' }
  | { kind: 'withdraw' }
  | { kind: 'sign_in' }
  | { kind: 'full' }
  | { kind: 'closed' }
  | { kind: 'none' };

/** Which registration control the viewer gets. Guests are sent to sign in. */
export function registrationAction(
  status: TournamentStatus,
  viewer: Pick<TournamentViewerView, 'canRegister' | 'canWithdraw' | 'registrationBlocker' | 'isEntrant'>,
  account: { signedIn: boolean }
): RegistrationAction {
  if (viewer.canWithdraw) return { kind: 'withdraw' };
  if (viewer.isEntrant) return { kind: 'none' };
  if (status !== 'registration') return { kind: 'none' };
  if (!account.signedIn || viewer.registrationBlocker === 'sign_in') return { kind: 'sign_in' };
  if (viewer.canRegister) return { kind: 'register' };
  if (viewer.registrationBlocker === 'full') return { kind: 'full' };
  if (viewer.registrationBlocker === 'closed') return { kind: 'closed' };
  return { kind: 'none' };
}

/** Absolute share link of a tournament (private ones carry the invite code). */
export function tournamentShareUrl(origin: string, tournamentId: string, inviteCode: string | null): string {
  return `${origin.replace(/\/+$/, '')}${TOURNAMENT_ROUTES.detail(tournamentId, inviteCode)}`;
}

/** The entrant's placement line on "my tournaments" cards. */
export function entryLine(entry: { status: string; finalRank: number | null } | null, isHost: boolean): string | null {
  if (entry?.finalRank) return `Finished ${ordinal(entry.finalRank)}`;
  if (entry?.status === 'eliminated') return 'Knocked out';
  if (entry) return isHost ? 'Hosting · playing' : 'Registered';
  return isHost ? 'Hosting' : null;
}

/** What hosting needs from the viewer: an account (its username names it on the brackets). */
export type HostAccess = 'loading' | 'sign_in' | 'ready';

export function hostAccess(account: { status: 'loading' | 'guest' | 'signed-in' }): HostAccess {
  if (account.status === 'loading') return 'loading';
  return account.status === 'guest' ? 'sign_in' : 'ready';
}

/** "Your tournaments" strip: live first, then upcoming, then the most recent past ones. */
export function myTournamentsStrip<T extends { id: string }>(view: { live: readonly T[]; upcoming: readonly T[]; past: readonly T[] }, limit: number): T[] {
  return [...view.live, ...view.upcoming, ...view.past].slice(0, limit);
}
