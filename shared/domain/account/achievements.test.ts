import { describe, expect, it } from 'vitest';

import { getTournamentAward, type TournamentParticipation } from '../tournament';
import {
  ACHIEVEMENTS,
  EMPTY_STATS,
  aggregateStats,
  findNewlyUnlocked,
  getAchievementStatuses,
  type AchievementContext,
  type GameResult,
  type PlayerStatsSummary,
  type RoundResult,
} from './index';

const DAY = 24 * 60 * 60 * 1000;
/** 2027-01-15T00:00:00Z, a UTC midnight. */
const MIDNIGHT = Date.UTC(2027, 0, 15);

let sequence = 0;
function game(overrides: Partial<GameResult> = {}): GameResult {
  sequence += 1;
  return {
    clientGameId: `game-${String(sequence).padStart(8, '0')}`,
    playedAt: MIDNIGHT + sequence,
    playerCount: 4,
    placement: 2,
    score: 60,
    rounds: [
      { bid: 1, tricksWon: 1, roundScore: 30 },
      { bid: 0, tricksWon: 0, roundScore: 20 },
      { bid: 1, tricksWon: 2, roundScore: -10 },
    ],
    ...overrides,
  };
}

const hit = (bid: number, roundScore = 20 + bid * 10): RoundResult => ({ bid, tricksWon: bid, roundScore });
const miss = (bid: number, tricksWon = bid + 1): RoundResult => ({ bid, tricksWon, roundScore: -10 * Math.abs(bid - tricksWon) });

function participation(overrides: Partial<TournamentParticipation> = {}): TournamentParticipation {
  sequence += 1;
  return {
    tournamentId: `tourney${String(sequence).padStart(5, '0')}`,
    name: 'Equinox Open',
    format: 'series',
    finishedAt: MIDNIGHT + sequence,
    entrants: 6,
    wasHost: false,
    wasEntrant: true,
    finalRank: 4,
    matchesPlayed: 3,
    tableWins: 0,
    roundsPlayed: 3,
    totalRounds: 3,
    flawless: false,
    awards: [{ awardId: 'finisher', tier: 'participation', xp: 50 }],
    ...overrides,
  };
}

function contextOf(
  results: readonly GameResult[],
  tournaments?: readonly TournamentParticipation[],
  stats: PlayerStatsSummary = aggregateStats(EMPTY_STATS, results)
): AchievementContext {
  return tournaments ? { stats, results, tournaments } : { stats, results };
}

function progressOf(id: string, context: AchievementContext) {
  const definition = ACHIEVEMENTS.find((achievement) => achievement.id === id);
  if (!definition) throw new Error(`unknown achievement ${id}`);
  return definition.progress(context);
}

const unlocks = (id: string, context: AchievementContext) => findNewlyUnlocked(context, new Set()).some((a) => a.id === id);

describe('achievement catalogue', () => {
  it('should have unique, url-safe ids and keep every existing id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
    // Ids are persisted in player_achievements: the original catalogue must never disappear.
    expect(ids).toEqual(
      expect.arrayContaining([
        'first-game', 'first-win', 'games-10', 'games-50', 'games-200', 'wins-10', 'wins-50', 'streak-3', 'streak-5',
        'bids-100', 'bids-1000', 'perfect-game', 'score-200', 'score-400', 'full-table-win', 'humble', 'underdog', 'podium-25',
      ])
    );
  });

  it('should start every achievement locked for a brand new player, with or without tournament history', () => {
    expect(findNewlyUnlocked(contextOf([]), new Set())).toEqual([]);
    expect(findNewlyUnlocked(contextOf([], []), new Set())).toEqual([]);
    for (const status of getAchievementStatuses(contextOf([]), new Map())) {
      expect(status.progress.current).toBe(0);
      expect(status.progress.target).toBeGreaterThan(0);
    }
  });
});

describe('single game achievements', () => {
  it('should unlock big bids only when the bid was hit exactly', () => {
    expect(unlocks('big-bid-5', contextOf([game({ rounds: [miss(6)] })]))).toBe(false);
    expect(unlocks('big-bid-5', contextOf([game({ rounds: [hit(4)] })]))).toBe(false);
    expect(unlocks('big-bid-5', contextOf([game({ rounds: [miss(1), hit(5)] })]))).toBe(true);
    expect(unlocks('big-bid-8', contextOf([game({ rounds: [hit(7)] })]))).toBe(false);
    expect(unlocks('big-bid-8', contextOf([game({ rounds: [hit(8)] })]))).toBe(true);
  });

  it('should find the longest run of exact bids within one game', () => {
    const nine = Array.from({ length: 9 }, () => hit(1));
    const brokenTen = game({ rounds: [...nine, miss(1), hit(1)] });
    expect(unlocks('bid-streak-10', contextOf([brokenTen]))).toBe(false);
    // Runs do not continue across games.
    expect(unlocks('bid-streak-10', contextOf([game({ rounds: nine }), game({ rounds: [hit(0)] })]))).toBe(false);
    expect(unlocks('bid-streak-10', contextOf([game({ rounds: [miss(2), ...nine, hit(0)] })]))).toBe(true);
  });

  it('should count marathon games by rounds played', () => {
    expect(unlocks('marathon', contextOf([game({ rounds: Array.from({ length: 14 }, () => hit(1)) })]))).toBe(false);
    expect(unlocks('marathon', contextOf([game({ rounds: Array.from({ length: 15 }, () => miss(1)) })]))).toBe(true);
  });

  it('should unlock the triad only for a 3-player win', () => {
    expect(unlocks('trio-win', contextOf([game({ playerCount: 3, placement: 2 })]))).toBe(false);
    expect(unlocks('trio-win', contextOf([game({ playerCount: 4, placement: 1 })]))).toBe(false);
    expect(unlocks('trio-win', contextOf([game({ playerCount: 3, placement: 1 })]))).toBe(true);
  });

  it('should track the table hopper over distinct winning table sizes 3 to 6', () => {
    const wins = [3, 4, 4, 6, 2].map((playerCount) => game({ playerCount, placement: 1 }));
    const lossAtFive = game({ playerCount: 5, placement: 2 });
    expect(progressOf('table-hopper', contextOf([...wins, lossAtFive]))).toEqual({ current: 3, target: 4 });
    expect(unlocks('table-hopper', contextOf([...wins, game({ playerCount: 5, placement: 1 })]))).toBe(true);
  });

  it('should use lifetime counters (including imported baselines) for legendary milestones', () => {
    const veteran: PlayerStatsSummary = {
      ...EMPTY_STATS,
      gamesPlayed: 500,
      gamesWon: 100,
      bestWinStreak: 10,
      totalTricksWon: 1000,
    };
    const context = contextOf([], undefined, veteran);
    for (const id of ['games-500', 'wins-100', 'streak-10', 'tricks-1000']) expect(unlocks(id, context)).toBe(true);

    const almost = contextOf([], undefined, { ...veteran, gamesPlayed: 499, gamesWon: 99, bestWinStreak: 9, totalTricksWon: 999 });
    expect(progressOf('games-500', almost)).toEqual({ current: 499, target: 500 });
    for (const id of ['games-500', 'wins-100', 'streak-10', 'tricks-1000']) expect(unlocks(id, almost)).toBe(false);
  });

  it('should never show negative progress for the lifetime score', () => {
    const inDebt = contextOf([], undefined, { ...EMPTY_STATS, gamesPlayed: 3, totalScore: -120 });
    expect(progressOf('score-total-10000', inDebt)).toEqual({ current: 0, target: 10_000 });
    expect(unlocks('score-total-10000', contextOf([], undefined, { ...EMPTY_STATS, totalScore: 10_000 }))).toBe(true);
  });

  it('should sum correct zero bids across games', () => {
    const tenZeros = () => game({ rounds: [...Array.from({ length: 10 }, () => hit(0)), miss(0)] });
    const results = Array.from({ length: 4 }, tenZeros);
    expect(progressOf('zero-bids-50', contextOf(results))).toEqual({ current: 40, target: 50 });
    expect(unlocks('zero-bids-50', contextOf([...results, tenZeros()]))).toBe(true);
  });

  it('should count distinct UTC days, not games or local days', () => {
    // Two games either side of midnight UTC are two days; two games on the same UTC day are one.
    const days = (...playedAts: number[]) => progressOf('days-7', contextOf(playedAts.map((playedAt) => game({ playedAt })))).current;
    expect(days(MIDNIGHT - 1, MIDNIGHT)).toBe(2);
    expect(days(MIDNIGHT, MIDNIGHT + DAY - 1)).toBe(1);

    const sixDays = Array.from({ length: 6 }, (_, day) => game({ playedAt: MIDNIGHT + day * DAY + 3600_000 }));
    const sameDayAgain = game({ playedAt: MIDNIGHT + 5 * DAY + 7200_000 });
    expect(progressOf('days-7', contextOf([...sixDays, sameDayAgain]))).toEqual({ current: 6, target: 7 });
    expect(unlocks('days-7', contextOf([...sixDays, game({ playedAt: MIDNIGHT + 30 * DAY })]))).toBe(true);
  });

  it('should keep secret achievements hidden and unlock clouded crystal only for 5+ round blind games', () => {
    const secrets = ACHIEVEMENTS.filter((a) => a.secret).map((a) => a.id);
    expect(secrets).toEqual(
      expect.arrayContaining(['clouded-crystal', 'phoenix', 'perfect-balance', 'eternal-apprentice', 'lesser-evil', 'icarus', 'overreach', 'welcome-back'])
    );

    const fourMisses = Array.from({ length: 4 }, () => miss(1));
    expect(unlocks('clouded-crystal', contextOf([game({ rounds: fourMisses })]))).toBe(false);
    expect(unlocks('clouded-crystal', contextOf([game({ rounds: [...fourMisses, hit(0)] })]))).toBe(false);
    expect(unlocks('clouded-crystal', contextOf([game({ rounds: [...fourMisses, miss(0)] })]))).toBe(true);
  });

  it('should only crown a phoenix that won after falling to -50 or below', () => {
    const fall = [hit(0, 20), miss(3, 0), miss(4, 0)]; // 20 -> -10 -> -50
    const recover = [hit(5, 70), hit(4, 60)];
    expect(unlocks('phoenix', contextOf([game({ placement: 1, rounds: [...fall, ...recover] })]))).toBe(true);
    // Fell far enough but did not win.
    expect(unlocks('phoenix', contextOf([game({ placement: 2, rounds: [...fall, ...recover] })]))).toBe(false);
    // Won, but only fell to -40.
    const shallow = [hit(0, 20), miss(3, 0), miss(3, 0), ...recover];
    expect(unlocks('phoenix', contextOf([game({ placement: 1, rounds: shallow })]))).toBe(false);
  });

  it('should unlock perfect balance for a finished game ending on exactly 0 points', () => {
    expect(unlocks('perfect-balance', contextOf([game({ score: 1 })]))).toBe(false);
    expect(unlocks('perfect-balance', contextOf([game({ score: 0, rounds: [] })]))).toBe(false);
    expect(unlocks('perfect-balance', contextOf([game({ score: 0, rounds: [hit(0, 20), miss(1, 3)] })]))).toBe(true);
  });

  it('should count only 10+ round games with 80% exact bids towards keen eye', () => {
    const keen = () => game({ rounds: [...Array.from({ length: 8 }, () => hit(1)), miss(1), miss(2)] });
    const shortGame = game({ rounds: Array.from({ length: 9 }, () => hit(1)) });
    const sloppy = game({ rounds: [...Array.from({ length: 7 }, () => hit(1)), miss(1), miss(1), miss(1)] });
    const nine = Array.from({ length: 9 }, keen);
    expect(progressOf('keen-eye', contextOf([...nine, shortGame, sloppy]))).toEqual({ current: 9, target: 10 });
    expect(unlocks('keen-eye', contextOf([...nine, keen()]))).toBe(true);
  });

  it('should fulfil the prophecy only with a perfect game of 15+ rounds', () => {
    const exact = (rounds: number) => Array.from({ length: rounds }, () => hit(1));
    expect(unlocks('prophecy-fulfilled', contextOf([game({ rounds: exact(14) })]))).toBe(false);
    expect(unlocks('prophecy-fulfilled', contextOf([game({ rounds: [...exact(14), miss(1)] })]))).toBe(false);
    expect(unlocks('prophecy-fulfilled', contextOf([game({ rounds: exact(15) })]))).toBe(true);
  });

  it('should break the unsinkable run on a last place, at any table size', () => {
    const safe = () => game({ playerCount: 4, placement: 3 });
    const nineteen = Array.from({ length: 19 }, safe);
    const lastOfTwo = game({ playerCount: 2, placement: 2 });
    expect(progressOf('unsinkable', contextOf([...nineteen, lastOfTwo, safe()]))).toEqual({ current: 19, target: 20 });
    expect(unlocks('unsinkable', contextOf([lastOfTwo, ...nineteen, game({ playerCount: 6, placement: 5 })]))).toBe(true);
  });

  it('should find consecutive UTC days, busy days and long breaks', () => {
    const at = (day: number, hour = 12) => game({ playedAt: MIDNIGHT + day * DAY + hour * 3600_000 });
    const gappedWeek = [0, 1, 2, 3, 5, 6, 7].map((day) => at(day));
    expect(progressOf('daily-ritual', contextOf(gappedWeek))).toEqual({ current: 4, target: 5 });
    expect(unlocks('daily-ritual', contextOf([...gappedWeek, at(4)]))).toBe(true);

    const fourToday = [1, 2, 3, 4].map((hour) => at(0, hour));
    expect(progressOf('spellbound', contextOf([...fourToday, at(1, 1)]))).toEqual({ current: 4, target: 5 });
    expect(unlocks('spellbound', contextOf([...fourToday, at(0, 23)]))).toBe(true);

    expect(unlocks('welcome-back', contextOf([at(0), at(29)]))).toBe(false);
    expect(unlocks('welcome-back', contextOf([at(0), at(10), at(40)]))).toBe(true);
  });

  it('should crown the lesser evil and burn icarus only on their exact conditions', () => {
    expect(unlocks('lesser-evil', contextOf([game({ placement: 2, score: -20 })]))).toBe(false);
    expect(unlocks('lesser-evil', contextOf([game({ placement: 1, score: 0 })]))).toBe(false);
    expect(unlocks('lesser-evil', contextOf([game({ placement: 1, score: -20 })]))).toBe(true);

    const climb = [hit(3, 50), hit(3, 50)]; // 100
    const crash = [miss(5, 0), miss(5, 0), miss(3, 0)]; // 100 -> -30
    expect(unlocks('icarus', contextOf([game({ score: -30, rounds: [...climb, ...crash] })]))).toBe(true);
    expect(unlocks('icarus', contextOf([game({ score: 10, rounds: [...climb, ...crash] })]))).toBe(false);
    expect(unlocks('icarus', contextOf([game({ score: -30, rounds: [hit(3, 50), hit(2, 40), ...crash] })]))).toBe(false);
  });

  it('should count a miss of 4+ tricks in either direction as overreach', () => {
    expect(unlocks('overreach', contextOf([game({ rounds: [miss(5, 2)] })]))).toBe(false);
    expect(unlocks('overreach', contextOf([game({ rounds: [miss(5, 1)] })]))).toBe(true);
    expect(unlocks('overreach', contextOf([game({ rounds: [miss(0, 4)] })]))).toBe(true);
  });
});

describe('tournament achievements', () => {
  it('should only count tournaments the player actually played', () => {
    const noShow = participation({ matchesPlayed: 0, roundsPlayed: 0, finalRank: 6, awards: [] });
    const hostOnly = participation({ wasHost: true, wasEntrant: false, finalRank: null, matchesPlayed: 0, awards: [] });
    expect(unlocks('tournament-first', contextOf([], [noShow, hostOnly]))).toBe(false);
    expect(unlocks('tournament-first', contextOf([], [participation()]))).toBe(true);

    const nine = Array.from({ length: 9 }, () => participation());
    expect(progressOf('tournaments-10', contextOf([], [...nine, noShow]))).toEqual({ current: 9, target: 10 });
    expect(unlocks('tournaments-10', contextOf([], [...nine, participation()]))).toBe(true);
  });

  it('should count titles towards the title ladder', () => {
    const title = () => participation({ finalRank: 1, tableWins: 2 });
    expect(unlocks('tournament-title', contextOf([], [participation({ finalRank: 2 })]))).toBe(false);
    expect(unlocks('tournament-title', contextOf([], [title()]))).toBe(true);
    expect(progressOf('tournament-titles-3', contextOf([], [title(), title()]))).toEqual({ current: 2, target: 3 });
    expect(unlocks('tournament-titles-3', contextOf([], [title(), title(), title()]))).toBe(true);
    const tenTitles = contextOf([], Array.from({ length: 10 }, title));
    expect(unlocks('tournament-titles-10', tenTitles)).toBe(true);
    expect(ACHIEVEMENTS.find((a) => a.id === 'tournament-titles-10')?.tier).toBe('legendary');
  });

  it('should count podium finishes (top 3) across tournaments', () => {
    const podiums = [1, 2, 3, 3].map((finalRank) => participation({ finalRank }));
    expect(progressOf('tournament-podium-5', contextOf([], [...podiums, participation({ finalRank: 4 })]))).toEqual({ current: 4, target: 5 });
    expect(unlocks('tournament-podium-5', contextOf([], [...podiums, participation({ finalRank: 2 })]))).toBe(true);
  });

  it('should reward hosting a completed tournament of 8+ players, played or not', () => {
    const hosted = (entrants: number) => participation({ wasHost: true, wasEntrant: false, finalRank: null, matchesPlayed: 0, entrants, awards: [] });
    expect(unlocks('tournament-host-8', contextOf([], [hosted(7)]))).toBe(false);
    expect(unlocks('tournament-host-8', contextOf([], [participation({ entrants: 12 })]))).toBe(false);
    expect(unlocks('tournament-host-8', contextOf([], [hosted(8)]))).toBe(true);
    expect(unlocks('tournament-host-8', contextOf([], [participation({ wasHost: true, entrants: 8 })]))).toBe(true);
  });

  it('should require a flawless title for untouchable', () => {
    expect(unlocks('tournament-flawless', contextOf([], [participation({ finalRank: 1, flawless: false })]))).toBe(false);
    expect(unlocks('tournament-flawless', contextOf([], [participation({ finalRank: 2, flawless: true })]))).toBe(false);
    expect(unlocks('tournament-flawless', contextOf([], [participation({ finalRank: 1, flawless: true, tableWins: 3 })]))).toBe(true);
  });

  it('should unlock comeback, oracle and iron constitution from the matching awards', () => {
    for (const awardId of ['comeback', 'oracle', 'iron-mage']) expect(getTournamentAward(awardId)).not.toBeNull();
    const withAward = (awardId: string) => participation({ awards: [{ awardId, tier: 'special', xp: 200 }] });
    expect(unlocks('tournament-comeback', contextOf([], [withAward('oracle')]))).toBe(false);
    expect(unlocks('tournament-comeback', contextOf([], [withAward('comeback')]))).toBe(true);
    expect(unlocks('tournament-oracle', contextOf([], [withAward('high-roller')]))).toBe(false);
    expect(unlocks('tournament-oracle', contextOf([], [withAward('oracle')]))).toBe(true);
    expect(unlocks('tournament-iron-mage', contextOf([], [withAward('finisher')]))).toBe(false);
    expect(unlocks('tournament-iron-mage', contextOf([], [withAward('iron-mage')]))).toBe(true);
  });

  it('should require a title in a field of 16+ for the multitude', () => {
    expect(unlocks('tournament-big-field', contextOf([], [participation({ finalRank: 1, entrants: 15 })]))).toBe(false);
    expect(unlocks('tournament-big-field', contextOf([], [participation({ finalRank: 2, entrants: 32 })]))).toBe(false);
    expect(unlocks('tournament-big-field', contextOf([], [participation({ finalRank: 1, entrants: 16 })]))).toBe(true);
  });

  it('should need a title in each format for the versatile victor', () => {
    const title = (format: TournamentParticipation['format']) => participation({ format, finalRank: 1 });
    expect(unlocks('tournament-knockout-title', contextOf([], [title('series')]))).toBe(false);
    expect(unlocks('tournament-knockout-title', contextOf([], [title('knockout')]))).toBe(true);
    const runnerUpKnockout = participation({ format: 'knockout', finalRank: 2 });
    expect(progressOf('tournament-both-formats', contextOf([], [title('series'), title('series'), runnerUpKnockout]))).toEqual({ current: 1, target: 2 });
    expect(unlocks('tournament-both-formats', contextOf([], [title('series'), title('knockout')]))).toBe(true);
  });

  it('should sum table wins and count hosted tournaments', () => {
    const tables = (tableWins: number) => participation({ tableWins });
    expect(progressOf('tournament-table-wins-25', contextOf([], [tables(10), tables(14)]))).toEqual({ current: 24, target: 25 });
    expect(unlocks('tournament-table-wins-25', contextOf([], [tables(10), tables(15)]))).toBe(true);

    const hosted = () => participation({ wasHost: true, wasEntrant: false, finalRank: null, matchesPlayed: 0, awards: [] });
    expect(progressOf('tournament-host-5', contextOf([], [...Array.from({ length: 4 }, hosted), participation()]))).toEqual({ current: 4, target: 5 });
    expect(unlocks('tournament-host-5', contextOf([], Array.from({ length: 5 }, hosted)))).toBe(true);
  });

  it('should keep unlocked achievements complete in statuses', () => {
    const statuses = getAchievementStatuses(contextOf([], []), new Map([['tournament-titles-3', 123]]));
    const status = statuses.find((s) => s.definition.id === 'tournament-titles-3');
    expect(status).toMatchObject({ unlockedAt: 123, progress: { current: 3, target: 3 } });
  });
});
