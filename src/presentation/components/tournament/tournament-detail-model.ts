import type {
  InviteToTournamentResult,
  StandingView,
  TournamentAwardView,
  TournamentDetailView,
  TournamentInviteSkipReason,
  TournamentMatchView,
  TournamentRoundView,
} from '@shared/application/use-cases/tournament';
import type { CharacterAppearance } from '@shared/domain/character';
import { TOURNAMENT_LIMITS, createSeededRandom } from '@shared/domain/tournament';

import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';
import type { PodiumContender } from '@/presentation/types/podium.types';

import { ordinal } from '../account/public/public-profile-format';
import { formatDuration } from './tournament-view-model';

/*
 * Pure view-model helpers of the tournament detail page (tables, viewer status, host tools,
 * invites, podium). Split from tournament-view-model.ts, which serves every tournament screen.
 */

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------

export type MatchTone = 'live' | 'overdue' | 'done' | 'void';

export interface MatchStatusPresentation {
  label: string;
  tone: MatchTone;
  /** Deadline or stale hint under a pending table; null once it is decided. */
  detail: string | null;
}

type TableTiming = Pick<TournamentMatchView, 'status' | 'staleAt' | 'resolvableAt' | 'deadlineAt' | 'live'>;

/** "round 3 of 10" while the game worker reports the table in play; null before its game started. */
export function liveRoundText(live: TournamentMatchView['live']): string | null {
  return live ? `round ${live.round} of ${live.maxRounds}` : null;
}

/** Status chip and timing line of one table. */
export function matchStatusPresentation(match: TableTiming, now: number): MatchStatusPresentation {
  if (match.status === 'completed') return { label: 'Played', tone: 'done', detail: null };
  if (match.status === 'void') return { label: 'Void', tone: 'void', detail: 'Not finished in time: every seat forfeits.' };
  const remaining = match.deadlineAt - now;
  const deadline = remaining > 0 ? `Voided in ${formatDuration(remaining)} if not finished.` : 'Past its deadline: voided on the next update.';
  const round = liveRoundText(match.live);
  if (now >= match.resolvableAt) {
    const lastSeen = round ? `No news since ${round}. ` : '';
    return { label: 'Overdue', tone: 'overdue', detail: `${lastSeen}The host may resolve it now. ${deadline}` };
  }
  return { label: round ? `Playing · ${round}` : 'Playing', tone: 'live', detail: deadline };
}

/**
 * The viewer may resolve overdue tables (hosts a running tournament), so tables explain when they
 * can't be resolved yet. A cancelled or finished tournament leaves nothing to resolve.
 */
export function managesTables(detail: {
  viewer: Pick<TournamentDetailView['viewer'], 'isHost'>;
  tournament: Pick<TournamentDetailView['tournament'], 'status'>;
}): boolean {
  return detail.viewer.isHost && detail.tournament.status === 'running';
}

/**
 * Why the host can't resolve an overdue table yet: it is still being played (the game worker
 * reported it lately). Null when resolving is not a question (decided, not overdue, or quiet).
 */
export function resolveBlockedReason(match: TableTiming, now: number): string | null {
  if (match.status !== 'pending' || now < match.staleAt || now >= match.resolvableAt) return null;
  const round = liveRoundText(match.live);
  return `Still being played${round ? ` (${round})` : ''}, so it can't be resolved. If the table goes quiet, you can resolve it in ${formatDuration(match.resolvableAt - now)}.`;
}

/** Caption under a knockout table: how many of its players go through. */
export function advanceCaption(advancing: number): string {
  return advancing === 1 ? 'Winner advances' : `Top ${advancing} advance`;
}

/** The round a knockout entrant reached, by its label ("Final", "Round 2"). */
export function reachedLabel(reachedRound: number, rounds: readonly Pick<TournamentRoundView, 'round' | 'label'>[]): string {
  if (reachedRound <= 0) return '—';
  return rounds.find((round) => round.round === reachedRound)?.label ?? `Round ${reachedRound}`;
}

// ---------------------------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------------------------

type ViewerSource = Pick<TournamentDetailView, 'viewer' | 'standings' | 'entrants'> & {
  tournament: Pick<TournamentDetailView['tournament'], 'status' | 'startsAt'>;
};

/** One line telling the viewer where they stand (null when the page has nothing personal to say). */
export function viewerProgressLine(detail: ViewerSource): string | null {
  const { viewer, tournament } = detail;
  if (!viewer.isEntrant) return null;
  switch (tournament.status) {
    case 'registration':
      return tournament.startsAt === null
        ? 'You are registered. You will get a notification when your table is ready.'
        : 'You are registered. Your first table opens when the tournament starts.';
    case 'running':
      if (viewer.myMatch) return null;
      if (viewer.entrantStatus === 'eliminated') return 'You were knocked out. Follow the remaining tables below.';
      return 'Your table is done. The next round starts when every table has finished.';
    case 'completed': {
      const own = detail.standings.find((standing) => standing.userId === viewer.userId);
      return own ? `You finished ${ordinal(own.rank)} of ${detail.standings.length}.` : null;
    }
    case 'cancelled':
      return null;
  }
}

/** Why the host can't start yet (null when they can, or when starting is not a question). */
export function startBlocker(detail: Pick<TournamentDetailView, 'viewer' | 'entrants'> & { tournament: Pick<TournamentDetailView['tournament'], 'status' | 'minimumEntrants'> }): string | null {
  if (!detail.viewer.isHost || detail.tournament.status !== 'registration' || detail.viewer.canStart) return null;
  const missing = detail.tournament.minimumEntrants - detail.entrants.length;
  if (missing <= 0) return null;
  return `At least ${detail.tournament.minimumEntrants} players are needed to start (${missing} more).`;
}

/**
 * The inbox "Join" link opens the page with ?join=1: fetch a ticket and open the table at once,
 * but only when there is a pending table and the page has not tried already.
 */
export function shouldAutoJoin(joinRequested: boolean, myMatch: TournamentDetailView['viewer']['myMatch'], attempted: boolean): boolean {
  return joinRequested && !attempted && myMatch !== null;
}

// ---------------------------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------------------------

interface InvitableFriend {
  userId: string;
  displayName: string;
  presence: { status: string };
}

/** Friends the host can still invite: not registered yet, online ones first, then by name. */
export function inviteCandidates<T extends InvitableFriend>(friends: readonly T[], entrantIds: ReadonlySet<string>): T[] {
  const online = (friend: T) => (friend.presence.status === 'offline' ? 1 : 0);
  return friends
    .filter((friend) => !entrantIds.has(friend.userId))
    .sort((a, b) => online(a) - online(b) || a.displayName.localeCompare(b.displayName));
}

/** Toggles one player in the invite selection, never beyond MAX_INVITES_PER_REQUEST. */
export function toggleInvite(selected: ReadonlySet<string>, userId: string, max: number = TOURNAMENT_LIMITS.MAX_INVITES_PER_REQUEST): Set<string> {
  const next = new Set(selected);
  if (next.has(userId)) next.delete(userId);
  else if (next.size < max) next.add(userId);
  return next;
}

/** Label of the send button for `count` selected players. */
export function inviteButtonLabel(count: number): string {
  if (count === 0) return 'Pick friends to invite';
  return count === 1 ? 'Send 1 invite' : `Send ${count} invites`;
}

const SKIP_REASONS: Record<TournamentInviteSkipReason, string> = {
  self: 'that is you',
  already_registered: 'already registered',
  not_found: 'account not found',
  not_allowed: 'not accepting invites',
  recently_invited: 'invited recently',
  rate_limited: 'invite limit reached, try later',
};

export interface InviteSummary {
  tone: 'success' | 'warning';
  lines: string[];
}

/** What happened to an invite request, in player words. */
export function inviteSummary(result: InviteToTournamentResult, nameOf: (userId: string) => string): InviteSummary {
  const lines: string[] = [];
  const invited = result.invited.length;
  if (invited > 0) lines.push(invited === 1 ? `Invited ${nameOf(result.invited[0])}.` : `Invited ${invited} players.`);
  for (const skipped of result.skipped) lines.push(`${nameOf(skipped.userId)}: ${SKIP_REASONS[skipped.reason] ?? 'not invited'}.`);
  if (lines.length === 0) lines.push('Nobody was invited.');
  return { tone: invited > 0 && result.skipped.length === 0 ? 'success' : 'warning', lines };
}

// ---------------------------------------------------------------------------------------------
// Podium and celebration
// ---------------------------------------------------------------------------------------------

/** Awards grouped by player, in the registry's order (champion first). */
export function awardsByPlayer(awards: readonly TournamentAwardView[]): Map<string, TournamentAwardView[]> {
  const byPlayer = new Map<string, TournamentAwardView[]>();
  for (const award of awards) {
    const list = byPlayer.get(award.player.userId) ?? [];
    list.push(award);
    byPlayer.set(award.player.userId, list);
  }
  return byPlayer;
}

export interface PodiumEntry {
  standing: StandingView;
  awards: TournamentAwardView[];
}

const PODIUM_SIZE = 3;

/** The top three of a completed tournament with their awards. */
export function podiumEntries(standings: readonly StandingView[], awards: readonly TournamentAwardView[]): PodiumEntry[] {
  const byPlayer = awardsByPlayer(awards);
  return standings
    .filter((standing) => standing.matchesPlayed > 0)
    .slice(0, PODIUM_SIZE)
    .map((standing) => ({ standing, awards: byPlayer.get(standing.userId) ?? [] }));
}

/** Special awards (not podium or participation) for the "honours" list under the podium. */
export function honourAwards(awards: readonly TournamentAwardView[]): TournamentAwardView[] {
  return awards.filter((award) => award.tier === 'special');
}

/** XP the viewer earned in this tournament (sum of their awards). */
export function viewerAwardXp(awards: readonly TournamentAwardView[], viewerId: string | null): number {
  if (viewerId === null) return 0;
  return awards.filter((award) => award.player.userId === viewerId).reduce((sum, award) => sum + award.xp, 0);
}

/**
 * The podium's players in the looks the standings carry. The viewer's own look comes from this
 * page (a fresh save shows at once); a player without one is a silhouette.
 */
export function tournamentPodiumContenders(
  entries: readonly PodiumEntry[],
  viewerId: string | null,
  viewerAppearance: CharacterAppearance | null
): PodiumContender[] {
  return entries.map(({ standing }) => {
    const isViewer = standing.userId === viewerId;
    return {
      id: standing.userId,
      rank: standing.rank,
      name: standing.displayName,
      appearance: (isViewer ? viewerAppearance : null) ?? standing.appearance ?? null,
      detail: `${standing.points} pts`,
      isViewer,
    };
  });
}

export interface ConfettiPiece {
  /** Stable key. */
  id: number;
  /** Horizontal start, percent of the width. */
  left: number;
  /** Sideways drift while falling, px. */
  drift: number;
  rotate: number;
  delay: number;
  /** Index into the celebration palette. */
  color: number;
  /** Edge length, px. */
  size: number;
}

const CONFETTI = {
  MAX_DRIFT_PX: 80,
  MAX_ROTATION_DEG: 720,
  MAX_DELAY_S: 0.6,
  MIN_SIZE_PX: 5,
  SIZE_RANGE_PX: 5,
  PERCENT: 100,
} as const;

/**
 * Confetti of the final podium. Seeded by the tournament id, so a render is pure and every
 * visitor sees the same burst.
 */
export function confettiPieces(seed: string, colors: number, count: number = TOURNAMENT_UI.CELEBRATION_PIECES): ConfettiPiece[] {
  const random = createSeededRandom(`${seed}:confetti`);
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: random() * CONFETTI.PERCENT,
    drift: (random() * 2 - 1) * CONFETTI.MAX_DRIFT_PX,
    rotate: (random() * 2 - 1) * CONFETTI.MAX_ROTATION_DEG,
    delay: random() * CONFETTI.MAX_DELAY_S,
    color: Math.floor(random() * colors),
    size: CONFETTI.MIN_SIZE_PX + random() * CONFETTI.SIZE_RANGE_PX,
  }));
}
