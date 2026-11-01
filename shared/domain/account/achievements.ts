import { TOURNAMENT_FORMAT_IDS } from '../tournament/tournament.types';
import type { TournamentParticipation } from '../tournament/participation';
import {
  ACHIEVEMENT_AWARD_IDS,
  ACHIEVEMENT_RULES,
  bidAccuracy,
  distinctDaysPlayed,
  earnedAward,
  highestBidHit,
  isBlindGame,
  isLast,
  isPerfectGame,
  isWin,
  longestBreakInDays,
  longestCorrectBidRun,
  longestDailyRun,
  longestGameRun,
  mostGamesInOneDay,
  playedTournament,
  reachedPodium,
  runningScoreRange,
  wonTournament,
  widestMiss,
  zeroBidsHit,
} from './achievement-facts';
import type { GameResult } from './game-result';
import type { PlayerStatsSummary } from './player-stats';

export { ACHIEVEMENT_RULES } from './achievement-facts';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'legendary';

/** Which part of the game an achievement is about; lets the UI group the catalogue. */
export type AchievementCategory = 'game' | 'tournament';

export interface AchievementContext {
  stats: PlayerStatsSummary;
  /** Every known game result, oldest first. */
  results: readonly GameResult[];
  /** Every completed tournament the player entered or hosted, oldest first. Omitted = none. */
  tournaments?: readonly TournamentParticipation[];
}

export interface AchievementProgress {
  current: number;
  target: number;
}

/**
 * An achievement is a pure rule over the player's history. Adding one means appending a
 * definition to GAME_ACHIEVEMENTS or TOURNAMENT_ACHIEVEMENTS; persistence and UI pick it up
 * without further changes. Ids are stored in player_achievements, so they never change.
 */
export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  /** lucide icon name (kebab-case), resolved by the presentation layer. */
  icon: string;
  tier: AchievementTier;
  category: AchievementCategory;
  /** Hidden until unlocked. */
  secret?: boolean;
  progress(context: AchievementContext): AchievementProgress;
}

type AchievementRule = Omit<AchievementDefinition, 'category'>;
type Progress = AchievementRule['progress'];

const capped = (target: number, current: number): AchievementProgress => ({ current: Math.min(target, current), target });

const counter = (target: number, read: (stats: PlayerStatsSummary) => number): Progress =>
  (context) => capped(target, read(context.stats));

const anyGame = (predicate: (result: GameResult) => boolean): Progress =>
  (context) => ({ current: context.results.some(predicate) ? 1 : 0, target: 1 });

const countGames = (target: number, predicate: (result: GameResult) => boolean): Progress =>
  (context) => capped(target, context.results.filter(predicate).length);

const sumOverGames = (target: number, read: (result: GameResult) => number): Progress =>
  (context) => capped(target, context.results.reduce((sum, result) => sum + read(result), 0));

const tournamentsOf = (context: AchievementContext): readonly TournamentParticipation[] => context.tournaments ?? [];

const countTournaments = (target: number, predicate: (participation: TournamentParticipation) => boolean): Progress =>
  (context) => capped(target, tournamentsOf(context).filter(predicate).length);

const anyTournament = (predicate: (participation: TournamentParticipation) => boolean): Progress => countTournaments(1, predicate);

const sumOverTournaments = (target: number, read: (participation: TournamentParticipation) => number): Progress =>
  (context) => capped(target, tournamentsOf(context).reduce((sum, participation) => sum + read(participation), 0));

const tableSizesWon: Progress = (context) => {
  const sizes: readonly number[] = ACHIEVEMENT_RULES.TABLE_HOPPER_SIZES;
  const won = new Set(context.results.filter((result) => isWin(result) && sizes.includes(result.playerCount)).map((result) => result.playerCount));
  return { current: won.size, target: sizes.length };
};

const tournamentFormatsWon: Progress = (context) => {
  const won = new Set(tournamentsOf(context).filter(wonTournament).map((participation) => participation.format));
  return { current: won.size, target: TOURNAMENT_FORMAT_IDS.length };
};

// --- Catalogue --------------------------------------------------------------------------------

const GAME_ACHIEVEMENTS: readonly AchievementRule[] = [
  { id: 'first-game', name: 'First Steps', description: 'Finish your first game.', icon: 'footprints', tier: 'bronze', progress: counter(1, (s) => s.gamesPlayed) },
  { id: 'first-win', name: 'Crowned', description: 'Win a game.', icon: 'crown', tier: 'bronze', progress: counter(1, (s) => s.gamesWon) },
  { id: 'games-10', name: 'Regular', description: 'Finish 10 games.', icon: 'swords', tier: 'bronze', progress: counter(10, (s) => s.gamesPlayed) },
  { id: 'games-50', name: 'Veteran', description: 'Finish 50 games.', icon: 'shield', tier: 'silver', progress: counter(50, (s) => s.gamesPlayed) },
  { id: 'games-200', name: 'Living Legend', description: 'Finish 200 games.', icon: 'castle', tier: 'gold', progress: counter(200, (s) => s.gamesPlayed) },
  { id: 'wins-10', name: 'Champion', description: 'Win 10 games.', icon: 'trophy', tier: 'silver', progress: counter(10, (s) => s.gamesWon) },
  { id: 'wins-50', name: 'Conqueror', description: 'Win 50 games.', icon: 'gem', tier: 'gold', progress: counter(50, (s) => s.gamesWon) },
  { id: 'streak-3', name: 'Hot Hand', description: 'Win 3 games in a row.', icon: 'flame', tier: 'silver', progress: counter(3, (s) => s.bestWinStreak) },
  { id: 'streak-5', name: 'Unstoppable', description: 'Win 5 games in a row.', icon: 'zap', tier: 'gold', progress: counter(5, (s) => s.bestWinStreak) },
  { id: 'bids-100', name: 'Seer', description: 'Hit 100 bids exactly.', icon: 'eye', tier: 'silver', progress: counter(100, (s) => s.correctBids) },
  { id: 'bids-1000', name: 'Oracle', description: 'Hit 1,000 bids exactly.', icon: 'sparkles', tier: 'legendary', progress: counter(1000, (s) => s.correctBids) },
  { id: 'perfect-game', name: 'Flawless Prophecy', description: 'Hit every bid in a game of 5+ rounds.', icon: 'target', tier: 'gold', progress: anyGame(isPerfectGame) },
  { id: 'score-200', name: 'High Roller', description: 'Score 200+ points in one game.', icon: 'coins', tier: 'silver', progress: anyGame((r) => r.score >= 200) },
  { id: 'score-400', name: 'Treasure Hoard', description: 'Score 400+ points in one game.', icon: 'landmark', tier: 'legendary', progress: anyGame((r) => r.score >= 400) },
  { id: 'full-table-win', name: 'King of the Hall', description: 'Win a game with 6 players.', icon: 'users', tier: 'gold', progress: anyGame((r) => r.playerCount === 6 && r.placement === 1) },
  { id: 'humble', name: 'Humble Mage', description: 'Correctly bid zero 5 times in one game.', icon: 'feather', tier: 'silver', secret: true, progress: anyGame((r) => zeroBidsHit(r) >= 5) },
  { id: 'underdog', name: 'Rock Bottom', description: 'Finish a game with a negative score.', icon: 'skull', tier: 'bronze', secret: true, progress: anyGame((r) => r.score < 0) },
  { id: 'podium-25', name: 'Podium Regular', description: 'Place top 2 in 25 games.', icon: 'medal', tier: 'silver', progress: countGames(25, (r) => r.placement <= 2) },
  { id: 'big-bid-5', name: 'Bold Prophecy', description: 'Hit a bid of 5 or more exactly.', icon: 'telescope', tier: 'silver', progress: anyGame((r) => highestBidHit(r) >= 5) },
  { id: 'big-bid-8', name: 'Grand Prophecy', description: 'Hit a bid of 8 or more exactly.', icon: 'wand-sparkles', tier: 'gold', progress: anyGame((r) => highestBidHit(r) >= 8) },
  { id: 'bid-streak-10', name: 'Unbroken Vision', description: 'Hit 10 bids in a row in one game.', icon: 'link-2', tier: 'gold', progress: anyGame((r) => longestCorrectBidRun(r) >= 10) },
  { id: 'marathon', name: 'Marathon Mage', description: 'Finish a game of 15 or more rounds.', icon: 'hourglass', tier: 'bronze', progress: anyGame((r) => r.rounds.length >= 15) },
  { id: 'trio-win', name: 'Triad Victor', description: 'Win a game with 3 players.', icon: 'triangle', tier: 'bronze', progress: anyGame((r) => r.playerCount === 3 && isWin(r)) },
  { id: 'table-hopper', name: 'Table Hopper', description: 'Win at every table size from 3 to 6 players.', icon: 'layout-grid', tier: 'gold', progress: tableSizesWon },
  { id: 'streak-10', name: 'Endless Reign', description: 'Win 10 games in a row.', icon: 'infinity', tier: 'legendary', progress: counter(10, (s) => s.bestWinStreak) },
  { id: 'games-500', name: 'Ancient Archmage', description: 'Finish 500 games.', icon: 'mountain-snow', tier: 'legendary', progress: counter(500, (s) => s.gamesPlayed) },
  { id: 'wins-100', name: 'Hundredfold Crown', description: 'Win 100 games.', icon: 'star', tier: 'legendary', progress: counter(100, (s) => s.gamesWon) },
  { id: 'tricks-1000', name: 'Trick Hoarder', description: 'Win 1,000 tricks.', icon: 'layers', tier: 'gold', progress: counter(1000, (s) => s.totalTricksWon) },
  { id: 'zero-bids-50', name: 'Master of Restraint', description: 'Correctly bid zero 50 times.', icon: 'hand', tier: 'silver', progress: sumOverGames(50, zeroBidsHit) },
  { id: 'days-7', name: 'Faithful Familiar', description: 'Play on 7 different days.', icon: 'calendar-days', tier: 'silver', progress: (context) => capped(7, distinctDaysPlayed(context.results)) },
  { id: 'clouded-crystal', name: 'Clouded Crystal', description: 'Miss every bid in a game of 5+ rounds.', icon: 'cloud-fog', tier: 'bronze', secret: true, progress: anyGame(isBlindGame) },
  {
    id: 'phoenix',
    name: 'Phoenix',
    description: 'Win a game after your score fell to -50 or below.',
    icon: 'bird',
    tier: 'gold',
    secret: true,
    progress: anyGame((r) => isWin(r) && runningScoreRange(r).lowest <= ACHIEVEMENT_RULES.PHOENIX_LOW_POINT),
  },
  { id: 'perfect-balance', name: 'Perfect Balance', description: 'Finish a game with exactly 0 points.', icon: 'scale', tier: 'silver', secret: true, progress: anyGame((r) => r.rounds.length > 0 && r.score === 0) },
  { id: 'bids-25', name: 'Apprentice Seer', description: 'Hit 25 bids exactly.', icon: 'glasses', tier: 'bronze', progress: counter(25, (s) => s.correctBids) },
  { id: 'tricks-100', name: 'Trick Taker', description: 'Win 100 tricks.', icon: 'spade', tier: 'bronze', progress: counter(100, (s) => s.totalTricksWon) },
  { id: 'rounds-1000', name: 'Thousand Rounds', description: 'Play 1,000 rounds.', icon: 'library', tier: 'silver', progress: counter(1000, (s) => s.totalRounds) },
  { id: 'score-total-10000', name: "Dragon's Hoard", description: 'Earn 10,000 points across all your games.', icon: 'vault', tier: 'gold', progress: counter(10_000, (s) => Math.max(0, s.totalScore)) },
  {
    id: 'keen-eye',
    name: 'Keen Eye',
    description: 'Hit 80% of your bids in 10 games of 10+ rounds.',
    icon: 'crosshair',
    tier: 'silver',
    progress: countGames(10, (r) => r.rounds.length >= ACHIEVEMENT_RULES.KEEN_EYE_MIN_ROUNDS && bidAccuracy(r) >= ACHIEVEMENT_RULES.KEEN_EYE_ACCURACY),
  },
  {
    id: 'prophecy-fulfilled',
    name: 'Prophecy Fulfilled',
    description: 'Hit every bid in a game of 15+ rounds.',
    icon: 'moon-star',
    tier: 'legendary',
    progress: anyGame((r) => isPerfectGame(r) && r.rounds.length >= ACHIEVEMENT_RULES.PROPHECY_ROUNDS),
  },
  { id: 'crowded-hall', name: 'Crowded Hall', description: 'Finish 25 games with 6 players.', icon: 'party-popper', tier: 'silver', progress: countGames(25, (r) => r.playerCount === 6) },
  { id: 'unsinkable', name: 'Unsinkable', description: 'Finish 20 games in a row without coming last.', icon: 'anchor', tier: 'gold', progress: (context) => capped(20, longestGameRun(context.results, (r) => !isLast(r))) },
  { id: 'days-30', name: 'Devoted Disciple', description: 'Play on 30 different days.', icon: 'calendar-check', tier: 'gold', progress: (context) => capped(30, distinctDaysPlayed(context.results)) },
  { id: 'daily-ritual', name: 'Daily Ritual', description: 'Play on 5 days in a row.', icon: 'calendar-range', tier: 'silver', progress: (context) => capped(5, longestDailyRun(context.results)) },
  { id: 'spellbound', name: 'Spellbound', description: 'Finish 5 games in one day.', icon: 'coffee', tier: 'silver', progress: (context) => capped(5, mostGamesInOneDay(context.results)) },
  { id: 'eternal-apprentice', name: 'Eternal Apprentice', description: 'Finish second 25 times.', icon: 'ribbon', tier: 'bronze', secret: true, progress: countGames(25, (r) => r.placement === 2) },
  { id: 'lesser-evil', name: 'The Lesser Evil', description: 'Win a game with a negative score.', icon: 'ghost', tier: 'gold', secret: true, progress: anyGame((r) => isWin(r) && r.score < 0) },
  {
    id: 'icarus',
    name: 'Icarus',
    description: 'Climb to 100+ points in a game, then finish below zero.',
    icon: 'sunset',
    tier: 'bronze',
    secret: true,
    progress: anyGame((r) => r.score < 0 && runningScoreRange(r).highest >= ACHIEVEMENT_RULES.ICARUS_HIGH_POINT),
  },
  { id: 'overreach', name: 'Overreach', description: 'Miss a bid by 4 or more tricks.', icon: 'tornado', tier: 'bronze', secret: true, progress: anyGame((r) => widestMiss(r) >= ACHIEVEMENT_RULES.OVERREACH_MISS) },
  {
    id: 'welcome-back',
    name: 'Welcome Back',
    description: 'Return to the table after 30 days or more away.',
    icon: 'sprout',
    tier: 'bronze',
    secret: true,
    progress: (context) => ({ current: longestBreakInDays(context.results) >= ACHIEVEMENT_RULES.RETURN_AFTER_DAYS ? 1 : 0, target: 1 }),
  },
];

const TOURNAMENT_ACHIEVEMENTS: readonly AchievementRule[] = [
  { id: 'tournament-first', name: 'Tourney Initiate', description: 'Finish your first tournament.', icon: 'flag', tier: 'bronze', progress: anyTournament(playedTournament) },
  { id: 'tournament-title', name: 'Tourney Champion', description: 'Win a tournament.', icon: 'award', tier: 'silver', progress: anyTournament(wonTournament) },
  { id: 'tournament-titles-3', name: 'Thrice Crowned', description: 'Win 3 tournaments.', icon: 'shield-check', tier: 'gold', progress: countTournaments(3, wonTournament) },
  { id: 'tournament-titles-10', name: 'Sovereign of the Circuit', description: 'Win 10 tournaments.', icon: 'orbit', tier: 'legendary', progress: countTournaments(10, wonTournament) },
  { id: 'tournament-podium-5', name: 'Podium Sorcerer', description: 'Finish a tournament in the top 3 five times.', icon: 'podium', tier: 'silver', progress: countTournaments(5, reachedPodium) },
  {
    id: 'tournament-host-8',
    name: 'Grand Host',
    description: 'Host a tournament of 8+ players through to the end.',
    icon: 'tent',
    tier: 'silver',
    progress: anyTournament((p) => p.wasHost && p.entrants >= 8),
  },
  { id: 'tournament-flawless', name: 'Untouchable', description: 'Win a tournament by winning every table you sat at.', icon: 'diamond', tier: 'gold', progress: anyTournament((p) => wonTournament(p) && p.flawless) },
  { id: 'tournament-comeback', name: 'Turning Tide', description: 'Earn the Comeback award in a tournament.', icon: 'sunrise', tier: 'gold', progress: anyTournament(earnedAward(ACHIEVEMENT_AWARD_IDS.COMEBACK)) },
  { id: 'tournament-oracle', name: 'Tourney Oracle', description: 'Earn the Oracle award in a tournament.', icon: 'scroll-text', tier: 'silver', progress: anyTournament(earnedAward(ACHIEVEMENT_AWARD_IDS.ORACLE)) },
  { id: 'tournaments-10', name: 'Circuit Veteran', description: 'Finish 10 tournaments.', icon: 'compass', tier: 'gold', progress: countTournaments(10, playedTournament) },
  {
    id: 'tournament-big-field',
    name: 'Champion of the Multitude',
    description: 'Win a tournament of 16+ players.',
    icon: 'sun',
    tier: 'legendary',
    progress: anyTournament((p) => wonTournament(p) && p.entrants >= 16),
  },
  { id: 'tournament-knockout-title', name: 'Last Mage Standing', description: 'Win a knockout tournament.', icon: 'sword', tier: 'silver', progress: anyTournament((p) => wonTournament(p) && p.format === 'knockout') },
  { id: 'tournament-both-formats', name: 'Versatile Victor', description: 'Win both a series and a knockout tournament.', icon: 'shield-half', tier: 'gold', progress: tournamentFormatsWon },
  { id: 'tournament-iron-mage', name: 'Iron Constitution', description: 'Earn the Iron Mage award in a tournament.', icon: 'biceps-flexed', tier: 'bronze', progress: anyTournament(earnedAward(ACHIEVEMENT_AWARD_IDS.IRON_MAGE)) },
  { id: 'tournament-table-wins-25', name: 'Table Breaker', description: 'Win 25 tournament tables.', icon: 'hammer', tier: 'silver', progress: sumOverTournaments(25, (p) => (playedTournament(p) ? p.tableWins : 0)) },
  { id: 'tournament-host-5', name: 'Patron of the Circuit', description: 'Host 5 tournaments through to the end.', icon: 'handshake', tier: 'silver', progress: countTournaments(5, (p) => p.wasHost) },
];

const inCategory = (category: AchievementCategory, rules: readonly AchievementRule[]): AchievementDefinition[] =>
  rules.map((rule) => ({ ...rule, category }));

/** The whole catalogue, in display order. */
export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  ...inCategory('game', GAME_ACHIEVEMENTS),
  ...inCategory('tournament', TOURNAMENT_ACHIEVEMENTS),
];

export interface AchievementStatus {
  definition: AchievementDefinition;
  progress: AchievementProgress;
  unlockedAt: number | null;
}

export function isComplete(progress: AchievementProgress): boolean {
  return progress.current >= progress.target;
}

/** Achievements that are complete now but not yet recorded as unlocked. */
export function findNewlyUnlocked(context: AchievementContext, alreadyUnlocked: ReadonlySet<string>): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((achievement) => !alreadyUnlocked.has(achievement.id) && isComplete(achievement.progress(context)));
}

export function getAchievementStatuses(context: AchievementContext, unlocked: ReadonlyMap<string, number>): AchievementStatus[] {
  return ACHIEVEMENTS.map((definition) => {
    const unlockedAt = unlocked.get(definition.id) ?? null;
    const progress = definition.progress(context);
    // Once unlocked an achievement stays unlocked, even if rules change later.
    return { definition, progress: unlockedAt === null ? progress : { current: progress.target, target: progress.target }, unlockedAt };
  });
}
