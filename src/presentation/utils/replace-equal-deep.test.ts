import { describe, expect, it } from 'vitest';

import { replaceEqualDeep } from './replace-equal-deep';

function snapshot(currentPlayerIndex: number, aliceHand = ['c1', 'c2']) {
  return {
    phase: 'PLAYING',
    currentPlayerIndex,
    players: [
      { id: 'alice', hand: aliceHand.map((id) => ({ id, suit: 'HUMANS', value: 3 })) },
      { id: 'bob', hand: [{ id: 'c9', suit: 'ELVES', value: 7 }] },
    ],
    currentTrick: { cards: [], leadSuit: null, winnerId: null },
  };
}

describe('replaceEqualDeep', () => {
  it('should return the previous object for an identical snapshot', () => {
    const previous = snapshot(0);
    expect(replaceEqualDeep(previous, snapshot(0))).toBe(previous);
  });

  it('should keep every unchanged player, hand and trick when only the turn moved', () => {
    const previous = snapshot(0);
    const next = replaceEqualDeep(previous, snapshot(1));

    expect(next).not.toBe(previous);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.players).toBe(previous.players);
    expect(next.currentTrick).toBe(previous.currentTrick);
  });

  it('should replace only the path that changed, matching cards and players by id', () => {
    const previous = snapshot(0);
    const next = replaceEqualDeep(previous, snapshot(1, ['c2']));

    expect(next.players).not.toBe(previous.players);
    expect(next.players[0]).not.toBe(previous.players[0]);
    expect(next.players[0].hand[0]).toBe(previous.players[0].hand[1]);
    expect(next.players[1]).toBe(previous.players[1]);
  });

  it('should notice added and removed keys and nulls', () => {
    const previous: Record<string, unknown> = { a: 1, b: null };
    expect(replaceEqualDeep(previous, { a: 1 })).not.toBe(previous);
    expect(replaceEqualDeep(previous, { a: 1, b: null, c: undefined })).not.toBe(previous);
    expect(replaceEqualDeep({ a: { x: 1 } }, { a: null })).toEqual({ a: null });
  });

  it('should take arrays of a new length and non-plain values as they come', () => {
    const date = new Date(0);
    expect(replaceEqualDeep([1, 2], [1, 2, 3])).toEqual([1, 2, 3]);
    expect(replaceEqualDeep({ at: new Date(0) }, { at: date }).at).toBe(date);
  });
});
