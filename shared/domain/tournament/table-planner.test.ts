import { describe, expect, it } from 'vitest';

import { canSeat, distributeInOrder, distributeSnake, largestSeatableCount, planSeating, planTables } from './table-planner';
import { TournamentError } from './tournament-error';
import { TOURNAMENT_LIMITS } from './tournament.constants';

const MIN = TOURNAMENT_LIMITS.MIN_TABLE_SIZE;

describe('planTables', () => {
  it('balances tables with the fewest possible tables', () => {
    expect(planTables(7, { min: 3, max: 6 })).toEqual([4, 3]);
    expect(planTables(13, { min: 3, max: 5 })).toEqual([5, 4, 4]);
    expect(planTables(6, { min: 3, max: 6 })).toEqual([6]);
    expect(planTables(64, { min: 3, max: 6 })).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5]);
  });

  it('throws a domain error when no split exists', () => {
    expect(() => planTables(4, { min: 3, max: 3 })).toThrow(TournamentError);
    expect(() => planTables(5, { min: 3, max: 4 })).toThrow(TournamentError);
    expect(() => planTables(2, { min: 3, max: 6 })).toThrow(TournamentError);
  });

  it('respects the bounds and balance for every field of 3..64 and table size 3..6', () => {
    for (let max = MIN; max <= TOURNAMENT_LIMITS.MAX_TABLE_SIZE; max++) {
      for (let count = 3; count <= TOURNAMENT_LIMITS.MAX_ENTRANTS; count++) {
        const bounds = { min: MIN, max };
        if (!canSeat(count, bounds)) {
          expect(() => planTables(count, bounds)).toThrow(TournamentError);
          continue;
        }
        const sizes = planTables(count, bounds);
        expect(sizes.reduce((a, b) => a + b, 0)).toBe(count);
        expect(sizes.length).toBe(Math.ceil(count / max));
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        for (const size of sizes) expect(size >= MIN && size <= max).toBe(true);
      }
    }
  });

  it('can always seat 3+ players at tables of 5 or 6', () => {
    for (const max of [5, 6]) for (let count = 3; count <= 64; count++) expect(canSeat(count, { min: MIN, max })).toBe(true);
  });

  it('finds the largest seatable count', () => {
    expect(largestSeatableCount(5, { min: 3, max: 3 })).toBe(3);
    expect(largestSeatableCount(5, { min: 3, max: 4 })).toBe(4);
    expect(largestSeatableCount(2, { min: 3, max: 6 })).toBe(0);
  });
});

describe('planSeating', () => {
  it('uses no bots when the field splits evenly', () => {
    expect(planSeating(7, 6, true)).toEqual([{ humans: 4, bots: 0 }, { humans: 3, bots: 0 }]);
  });

  it('pads small or unsplittable fields with bots', () => {
    expect(planSeating(2, 6, true)).toEqual([{ humans: 2, bots: 1 }]);
    expect(planSeating(4, 3, true)).toEqual([{ humans: 2, bots: 1 }, { humans: 2, bots: 1 }]);
    expect(planSeating(5, 4, true)).toEqual([{ humans: 3, bots: 0 }, { humans: 2, bots: 1 }]);
  });

  it('refuses unsplittable fields without bots', () => {
    expect(() => planSeating(4, 3, false)).toThrow(/Allow bots/);
  });

  it('keeps every padded table within the size bounds for 1..64 humans', () => {
    for (let max = MIN; max <= 6; max++) {
      for (let humans = 1; humans <= 64; humans++) {
        const tables = planSeating(humans, max, true);
        expect(tables.reduce((sum, table) => sum + table.humans, 0)).toBe(humans);
        for (const table of tables) {
          expect(table.humans + table.bots).toBeGreaterThanOrEqual(MIN);
          expect(table.humans + table.bots).toBeLessThanOrEqual(max);
          if (humans >= 2) expect(table.humans).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('distribution', () => {
  it('deals in snake order so top seeds are spread', () => {
    expect(distributeSnake([1, 2, 3, 4, 5, 6, 7, 8, 9], [3, 3, 3])).toEqual([[1, 6, 7], [2, 5, 8], [3, 4, 9]]);
    expect(distributeSnake([1, 2, 3, 4, 5, 6, 7], [4, 3])).toEqual([[1, 4, 5, 7], [2, 3, 6]]);
  });

  it('fills unequal tables completely', () => {
    const tables = distributeSnake([1, 2, 3, 4, 5, 6, 7], [4, 3]);
    expect(tables.map((t) => t.length)).toEqual([4, 3]);
    expect(tables.flat().sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('deals in order for Swiss tables', () => {
    expect(distributeInOrder(['a', 'b', 'c', 'd', 'e', 'f', 'g'], [4, 3])).toEqual([['a', 'b', 'c', 'd'], ['e', 'f', 'g']]);
  });
});
