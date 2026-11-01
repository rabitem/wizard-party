import { describe, expect, it } from 'vitest';

import { calculateVariance, getFirstPlayer, shuffleArray } from './monte-carlo-utils';
import { withSeededMath } from '../bot-ai.fixtures';

const SEATS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

describe('Monte Carlo helpers', () => {
  it.each([
    { dealer: 0, first: 'b' },
    { dealer: 2, first: 'd' },
    { dealer: 3, first: 'a' },
    { dealer: 7, first: 'a' },
  ])('lets the player left of dealer $dealer lead first', ({ dealer, first }) => {
    expect(getFirstPlayer(SEATS, dealer)).toBe(first);
  });

  it('shuffles into a permutation without touching the input, repeatably per seed', () => {
    const cards = Array.from({ length: 20 }, (_, i) => i);
    const shuffle = () => withSeededMath(3, () => shuffleArray(cards));

    const shuffled = shuffle();

    expect([...shuffled].sort((x, y) => x - y)).toEqual(cards);
    expect(shuffled).not.toEqual(cards);
    expect(cards).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(shuffle()).toEqual(shuffled);
  });

  it.each([
    { values: [], mean: 0, variance: 0 },
    { values: [2, 2, 2], mean: 2, variance: 0 },
    { values: [1, 3], mean: 2, variance: 1 },
    { values: [0, 0, 6], mean: 2, variance: 8 },
  ])('computes the population variance of $values', ({ values, mean, variance }) => {
    expect(calculateVariance(values, mean)).toBe(variance);
  });
});
