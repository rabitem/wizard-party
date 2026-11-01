import { describe, expect, it } from 'vitest';
import type { IPlayer } from '@shared/domain';

import { canSubmitBid, getBidSummary, getScrollLeftToReveal, resolveSelectableBid, stepBid } from './bid-rules';

describe('canSubmitBid', () => {
  it('should not allow the forbidden bid', () => {
    expect(canSubmitBid({ selectedBid: 0, maxBid: 1, forbiddenBid: 0 })).toBe(false);
  });

  it('should allow valid bids in range', () => {
    expect(canSubmitBid({ selectedBid: 1, maxBid: 1, forbiddenBid: 0 })).toBe(true);
    expect(canSubmitBid({ selectedBid: 0, maxBid: 20, forbiddenBid: null })).toBe(true);
  });

  it('should not allow bids outside the current round range', () => {
    expect(canSubmitBid({ selectedBid: -1, maxBid: 1, forbiddenBid: null })).toBe(false);
    expect(canSubmitBid({ selectedBid: 2, maxBid: 1, forbiddenBid: null })).toBe(false);
  });
});

describe('stepBid', () => {
  const range = (maxBid: number, forbiddenBid: number | null = null) => ({ maxBid, forbiddenBid });

  it('should step by one inside the range', () => {
    expect(stepBid(3, 1, range(10))).toBe(4);
    expect(stepBid(3, -1, range(10))).toBe(2);
  });

  it('should skip the forbidden bid in both directions', () => {
    expect(stepBid(2, 1, range(10, 3))).toBe(4);
    expect(stepBid(4, -1, range(10, 3))).toBe(2);
  });

  it('should stop at the range edges', () => {
    expect(stepBid(0, -1, range(5))).toBeNull();
    expect(stepBid(5, 1, range(5))).toBeNull();
  });

  it('should stop when the only bid left in that direction is forbidden', () => {
    expect(stepBid(1, -1, range(5, 0))).toBeNull();
    expect(stepBid(4, 1, range(5, 5))).toBeNull();
  });

  it('should work beyond ten cards (no quick-select cut-off)', () => {
    expect(stepBid(14, 1, range(20, 15))).toBe(16);
    expect(stepBid(19, 1, range(20))).toBe(20);
  });
});

describe('resolveSelectableBid', () => {
  const range = (maxBid: number, forbiddenBid: number | null = null) => ({ maxBid, forbiddenBid });

  it('should keep a valid pick', () => {
    expect(resolveSelectableBid(3, range(10, 4))).toBe(3);
    expect(resolveSelectableBid(0, range(1))).toBe(0);
  });

  it('should move a pick that became forbidden to the next lower bid', () => {
    expect(resolveSelectableBid(2, range(5, 2))).toBe(1);
  });

  it('should move a forbidden zero up', () => {
    expect(resolveSelectableBid(0, range(1, 0))).toBe(1);
    expect(resolveSelectableBid(0, range(5, 0))).toBe(1);
  });

  it('should clamp a pick into the round range and still avoid the forbidden bid', () => {
    expect(resolveSelectableBid(7, range(5))).toBe(5);
    expect(resolveSelectableBid(7, range(5, 5))).toBe(4);
    expect(resolveSelectableBid(-1, range(5))).toBe(0);
  });

  it('should always resolve to a bid that can be submitted when one exists', () => {
    for (let maxBid = 1; maxBid <= 20; maxBid++) {
      for (let forbiddenBid = 0; forbiddenBid <= maxBid; forbiddenBid++) {
        for (let pick = 0; pick <= maxBid; pick++) {
          const selectedBid = resolveSelectableBid(pick, range(maxBid, forbiddenBid));
          expect(canSubmitBid({ selectedBid, maxBid, forbiddenBid })).toBe(true);
        }
      }
    }
  });
});

describe('getBidSummary', () => {
  const player = (bid: number | null) => ({ bid }) as IPlayer;

  it('should count only placed bids', () => {
    expect(getBidSummary([player(2), player(null), player(0), player(3)])).toEqual({ totalBids: 5, bidsPlaced: 3 });
  });

  it('should be empty before anyone bids', () => {
    expect(getBidSummary([player(null), player(null), player(null)])).toEqual({ totalBids: 0, bidsPlaced: 0 });
  });
});

describe('getScrollLeftToReveal', () => {
  it('should keep the position when the item is visible', () => {
    expect(getScrollLeftToReveal(40, 80, 0, 200)).toBe(0);
    expect(getScrollLeftToReveal(100, 140, 50, 200)).toBe(50);
  });

  it('should scroll back to an item cut off on the left', () => {
    expect(getScrollLeftToReveal(40, 80, 60, 200)).toBe(40);
  });

  it('should scroll forward just enough to show an item cut off on the right', () => {
    expect(getScrollLeftToReveal(400, 444, 0, 300)).toBe(144);
  });
});
