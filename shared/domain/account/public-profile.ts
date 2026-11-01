import { displayedAppearance, type CharacterAppearance } from '../character';
import { getTournamentAward } from '../tournament/awards';
import { TROPHY_TIERS, type TournamentVisibility, type TrophyTier } from '../tournament/tournament.types';
import { ACHIEVEMENTS } from './achievements';
import { countCorrectBids, type RoundResult } from './game-result';
import { EMPTY_STATS, getAveragePlacement, getBidAccuracy, getWinRate, type PlayerStatsSummary } from './player-stats';
import { getProgression, type Progression } from './progression';

/*
 * The public face of an account at /u/<username>. The builder is the single place that decides
 * what leaves the server: it whitelists fields, so new columns never leak by accident.
 */

export const PUBLIC_PROFILE_LIMITS = {
  /** Pinned games shown on a profile (matches the per-user pin limit). */
  PINNED_GAMES: 6,
  /** Recent games shown when the player opted into a public history. */
  RECENT_GAMES: 10,
  /** Upper bound for achievements listed (defensive; the catalogue is smaller). */
  ACHIEVEMENTS: 100,
  /** Tournament trophies shown in the cabinet (newest first); the tier counts cover all of them. */
  TROPHIES: 24,
} as const;

const DEFAULT_AVATAR = 'wizard';
const AVATAR_ID = /^[a-z0-9_-]{1,32}$/;

/** One game as stored, before it is reduced to its public summary. */
export interface PublicProfileGameSource {
  playedAt: number;
  playerCount: number;
  placement: number;
  score: number;
  rounds: readonly RoundResult[];
  xp: number;
  pinnedAt?: number | null;
}

/** One tournament award as stored, before it is reduced to its public form. */
export interface PublicProfileTrophySource {
  tournamentId: string;
  tournamentName: string;
  /** Private tournaments are shown without their name or link. */
  visibility: TournamentVisibility;
  awardId: string;
  tier: TrophyTier;
  /** The player's final rank in that tournament (null if unranked). */
  finalRank: number | null;
  entrants: number;
  awardedAt: number;
}

/** Everything a reader adapter loads for one profile. May contain private data; never sent as-is. */
export interface PublicProfileSource {
  username: string;
  /** The username in the casing the player typed. */
  displayUsername: string;
  tagline: string;
  avatar: string | null;
  /** player_profiles.appearance as stored (untrusted); absent or null while none was saved. */
  appearance?: unknown;
  isPublic: boolean;
  showHistory: boolean;
  memberSince: number;
  totalXp: number;
  stats: Partial<PlayerStatsSummary> | null;
  achievements: readonly { id: string; unlockedAt: number }[];
  pinnedGames: readonly PublicProfileGameSource[];
  /** Ignored unless showHistory is true. */
  recentGames: readonly PublicProfileGameSource[];
  /** Newest first, at most PUBLIC_PROFILE_LIMITS.TROPHIES (readers without tournaments omit it). */
  trophies?: readonly PublicProfileTrophySource[];
  /** Awards per tier over the whole career, not just the listed trophies. */
  trophyCounts?: Partial<Record<TrophyTier, number>>;
}

export interface PublicGameSummary {
  playedAt: number;
  playerCount: number;
  placement: number;
  won: boolean;
  score: number;
  roundsPlayed: number;
  correctBids: number;
  xp: number;
}

export interface PublicPinnedGame extends PublicGameSummary {
  pinnedAt: number;
}

export interface PublicHeadlineStats {
  gamesPlayed: number;
  gamesWon: number;
  /** 0..1 */
  winRate: number;
  /** 0..1 */
  bidAccuracy: number;
  highestScore: number;
  bestWinStreak: number;
  /** 0 until the first game. */
  averagePlacement: number;
}

/** A trophy as shown publicly; tournament name and link only for public tournaments. */
export interface PublicTrophy {
  awardId: string;
  tier: TrophyTier;
  tournamentId: string | null;
  tournamentName: string | null;
  finalRank: number | null;
  entrants: number;
  awardedAt: number;
}

export type PublicTrophyCounts = Record<TrophyTier, number>;

export interface PublicProfile {
  /** Lowercase, as in the profile URL. */
  username: string;
  /** The username as the player spells it. */
  displayName: string;
  tagline: string;
  avatar: string;
  appearance: CharacterAppearance;
  progression: Progression;
  stats: PublicHeadlineStats;
  achievements: { id: string; unlockedAt: number }[];
  pinnedGames: PublicPinnedGame[];
  /** null when the player keeps their history private. */
  recentGames: PublicGameSummary[] | null;
  /** Tournament trophy cabinet, newest first. */
  trophies: PublicTrophy[];
  trophyCounts: PublicTrophyCounts;
  memberSince: number;
}

const KNOWN_ACHIEVEMENTS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));

function toGameSummary(game: PublicProfileGameSource): PublicGameSummary {
  return {
    playedAt: game.playedAt,
    playerCount: game.playerCount,
    placement: game.placement,
    won: game.placement === 1,
    score: game.score,
    roundsPlayed: game.rounds.length,
    correctBids: countCorrectBids({ rounds: [...game.rounds] }),
    xp: game.xp,
  };
}

function toHeadlineStats(source: Partial<PlayerStatsSummary> | null): PublicHeadlineStats {
  const stats: PlayerStatsSummary = { ...EMPTY_STATS, ...(source ?? {}) };
  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    winRate: getWinRate(stats),
    bidAccuracy: getBidAccuracy(stats),
    highestScore: stats.highestScore,
    bestWinStreak: stats.bestWinStreak,
    averagePlacement: getAveragePlacement(stats),
  };
}

function toPublicTrophy(trophy: PublicProfileTrophySource): PublicTrophy {
  const isPublic = trophy.visibility === 'public';
  return {
    awardId: trophy.awardId,
    tier: trophy.tier,
    tournamentId: isPublic ? trophy.tournamentId : null,
    tournamentName: isPublic ? trophy.tournamentName : null,
    finalRank: trophy.finalRank,
    entrants: trophy.entrants,
    awardedAt: trophy.awardedAt,
  };
}

/** Known awards only (an award retired from the registry is not shown), newest first, capped. */
function toPublicTrophies(trophies: readonly PublicProfileTrophySource[]): PublicTrophy[] {
  return trophies
    .filter((trophy) => getTournamentAward(trophy.awardId) !== null)
    .map(toPublicTrophy)
    .sort((a, b) => b.awardedAt - a.awardedAt)
    .slice(0, PUBLIC_PROFILE_LIMITS.TROPHIES);
}

function toTrophyCounts(counts: Partial<Record<TrophyTier, number>> | undefined): PublicTrophyCounts {
  const safe = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
  return Object.fromEntries(TROPHY_TIERS.map((tier) => [tier, safe(counts?.[tier])])) as PublicTrophyCounts;
}

export function sanitizeAvatarId(value: string | null | undefined): string {
  return typeof value === 'string' && AVATAR_ID.test(value) ? value : DEFAULT_AVATAR;
}

/**
 * Reduces the stored data to what may be shown publicly, or null when the profile is not public.
 * Pinned games are always shown; recent games only when the player opted in.
 */
export function buildPublicProfile(source: PublicProfileSource | null): PublicProfile | null {
  if (!source || !source.isPublic || !source.username) return null;

  const pinnedGames = source.pinnedGames
    .filter((game) => typeof game.pinnedAt === 'number')
    .sort((a, b) => (b.pinnedAt as number) - (a.pinnedAt as number))
    .slice(0, PUBLIC_PROFILE_LIMITS.PINNED_GAMES)
    .map((game) => ({ ...toGameSummary(game), pinnedAt: game.pinnedAt as number }));

  const recentGames = source.showHistory
    ? [...source.recentGames]
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, PUBLIC_PROFILE_LIMITS.RECENT_GAMES)
        .map(toGameSummary)
    : null;

  const achievements = source.achievements
    .filter((achievement) => KNOWN_ACHIEVEMENTS.has(achievement.id))
    .map(({ id, unlockedAt }) => ({ id, unlockedAt }))
    .sort((a, b) => b.unlockedAt - a.unlockedAt)
    .slice(0, PUBLIC_PROFILE_LIMITS.ACHIEVEMENTS);

  return {
    username: source.username,
    // The display casing must spell the same name; anything else falls back to the stored name.
    displayName: source.displayUsername.toLowerCase() === source.username ? source.displayUsername : source.username,
    tagline: source.tagline,
    avatar: sanitizeAvatarId(source.avatar),
    appearance: displayedAppearance(source.appearance, source.avatar),
    progression: getProgression(source.totalXp),
    stats: toHeadlineStats(source.stats),
    achievements,
    pinnedGames,
    recentGames,
    trophies: toPublicTrophies(source.trophies ?? []),
    trophyCounts: toTrophyCounts(source.trophyCounts),
    memberSince: source.memberSince,
  };
}
