import { describe, expect, it } from 'vitest';
import { allPairs, describeRow, eachChoice, type MatrixAxes, type MatrixValue } from './matrix';

/**
 * The matrix suites trust these designs to cover what their docs promise; a design that silently
 * drops a pair would shrink the browser coverage without any test going red.
 */
const AXES = {
  cardTheme: ['fantasy', 'classic', 'neon', 'pixel', 'manga'],
  tableTheme: ['default', 'forest', 'ocean', 'fire'],
  playerCount: [3, 4, 5, 6],
  cardNumberSize: ['small', 'medium', 'large'],
  scenario: ['baseline-trick', 'max-hand'],
} as const satisfies MatrixAxes;

function valuePairs(axes: MatrixAxes): Array<[string, string]> {
  const names = Object.keys(axes);
  const pairs: Array<[string, string]> = [];
  for (const [i, a] of names.entries()) {
    for (const b of names.slice(i + 1)) {
      for (const va of axes[a]) for (const vb of axes[b]) pairs.push([`${a}=${va}`, `${b}=${vb}`]);
    }
  }
  return pairs;
}

function entrySet(row: Record<string, MatrixValue>): Set<string> {
  return new Set(Object.entries(row).map(([name, value]) => `${name}=${value}`));
}

describe('eachChoice', () => {
  it('puts every value of every axis in some row, with as many rows as the largest axis', () => {
    const rows = eachChoice(AXES);
    expect(rows).toHaveLength(5);
    for (const [name, values] of Object.entries(AXES)) {
      expect(new Set<MatrixValue>(rows.map((row) => row[name as keyof typeof AXES]))).toEqual(new Set<MatrixValue>(values));
    }
  });
});

describe('allPairs', () => {
  it('covers every pair of values of any two axes', () => {
    const rows = allPairs(AXES).map(entrySet);
    const covers = ([a, b]: [string, string]): boolean => rows.some((row) => row.has(a) && row.has(b));
    const missing = valuePairs(AXES).filter((pair) => !covers(pair));
    expect(missing).toEqual([]);
  });

  it('needs far fewer rows than the full product', () => {
    // Lower bound: the two largest axes (5 x 4); the full product is 5 x 4 x 4 x 3 x 2 = 480.
    const count = allPairs(AXES).length;
    expect(count).toBeGreaterThanOrEqual(20);
    expect(count).toBeLessThanOrEqual(30);
  });

  it('gives the same rows in the same order every time, so a title names one row', () => {
    expect(allPairs(AXES)).toEqual(allPairs(AXES));
  });

  it('is the full product when there are only two axes', () => {
    expect(allPairs({ a: [1, 2, 3], b: ['x', 'y'] })).toHaveLength(6);
  });

  it('rejects an axis without values instead of returning no rows', () => {
    expect(() => allPairs({ a: [1], b: [] })).toThrow('Matrix axis "b" has no values');
  });
});

describe('describeRow', () => {
  it('names every axis and value in axis order', () => {
    expect(describeRow({ scenario: 'max-hand', playerCount: 6 })).toBe('scenario=max-hand playerCount=6');
  });
});
