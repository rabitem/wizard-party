import { BotDifficulty } from '@shared/domain/bot-ai/types';
import { TOURNAMENT_LIMITS, TOURNAMENT_TIMING } from '@shared/domain/tournament';
import type { TournamentListStatus } from '@shared/application/ports/tournament';
import { TOURNAMENT_PAGE_QUERY, tournamentPagePath } from '@shared/tournament/tournament-wire';

/**
 * Presentation constants of the tournament pages. Domain limits (names, sizes, rounds, timings)
 * live in TOURNAMENT_LIMITS / TOURNAMENT_TIMING and are imported, never repeated here.
 */
export const TOURNAMENT_UI = {
  /** Detail pages re-read the tournament this often while the tab is visible. */
  POLL_INTERVAL_MS: TOURNAMENT_TIMING.POLL_INTERVAL_MS,
  /** Countdowns (start time, table deadline) tick this often. */
  CLOCK_TICK_MS: 1000,
  /** "Copied" feedback on share buttons. */
  COPY_FEEDBACK_MS: 2000,
  /** Recent champions shown on the list page strip (the API sends at most this many). */
  CHAMPIONS_STRIP_SIZE: TOURNAMENT_LIMITS.RECENT_CHAMPIONS,
  /** "Your tournaments" cards on the list page (live and upcoming first). */
  MY_TOURNAMENTS_STRIP_SIZE: 6,
  /** Confetti pieces of the final podium celebration. */
  CELEBRATION_PIECES: 28,
  CELEBRATION_DURATION_S: 2.6,
  /** Confetti colours: gold, amber, parchment, silver, honour violet (the trophy tiers). */
  CELEBRATION_COLORS: ['#f5c542', '#d9932b', '#fff1c1', '#cbd5e1', '#b48cf0'],
  /** Trophies previewed next to "Your tournaments". */
  TROPHY_PREVIEW_SIZE: 5,
  /** A scheduled start closer than this shows a live countdown instead of a date. */
  COUNTDOWN_THRESHOLD_MS: 60 * 60 * 1000,
  /** Default scheduled start offered by the create form. */
  DEFAULT_START_OFFSET_MS: 60 * 60 * 1000,
  /** A stale table shows a warning this long before the host may resolve it. */
  STALE_WARNING_LEAD_MS: 10 * 60 * 1000,
} as const;

export const TOURNAMENT_ROUTES = {
  LIST: '/tournaments',
  NEW: '/tournaments/new',
  detail: (id: string, inviteCode?: string | null) => tournamentPagePath(id, { inviteCode }),
  /** The detail page that opens the viewer's pending table right away (fresh ticket). */
  join: (id: string) => tournamentPagePath(id, { join: true }),
  edit: (id: string) => `/tournaments/${encodeURIComponent(id)}/edit`,
  /** The game lobby of a match room (the connection picks up the stored ticket). */
  table: (roomCode: string) => `/lobby/${encodeURIComponent(roomCode)}`,
  signIn: (next: string) => `/sign-in?next=${encodeURIComponent(next)}`,
} as const;

/** Query parameters understood by the detail page (shared with the server's inbox actions). */
export const TOURNAMENT_QUERY = TOURNAMENT_PAGE_QUERY;

export const TOURNAMENT_LIST_TABS: readonly { id: TournamentListStatus; label: string; empty: string }[] = [
  { id: 'open', label: 'Open', empty: 'No tournament is taking sign-ups right now. Host the first one!' },
  { id: 'live', label: 'Live', empty: 'No tournament is being played right now.' },
  { id: 'finished', label: 'Finished', empty: 'No tournament has been decided yet.' },
];

/** Same names the lobby shows for bots, so the form and the table agree. */
export const BOT_DIFFICULTY_OPTIONS: readonly { value: BotDifficulty; label: string }[] = [
  { value: BotDifficulty.NOVICE, label: 'Easy' },
  { value: BotDifficulty.EASY, label: 'Medium' },
  { value: BotDifficulty.MEDIUM, label: 'Hard' },
  { value: BotDifficulty.HARD, label: 'Expert' },
  { value: BotDifficulty.EXPERT, label: 'Master' },
];
