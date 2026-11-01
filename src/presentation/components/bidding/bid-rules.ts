import type { IPlayer } from '@shared/domain';

/**
 * Pure bid-selection helpers shared by every bidding surface (panel and sheet), so the
 * forbidden-bid skip and the submit guard live in one tested place.
 */

interface BidRange {
  maxBid: number;
  forbiddenBid: number | null;
}

/** Whether `bid` may be placed this round: in range and not the forbidden (hook) bid. */
export function canSubmitBid({ selectedBid, maxBid, forbiddenBid }: BidRange & { selectedBid: number }): boolean {
  return selectedBid >= 0 && selectedBid <= maxBid && selectedBid !== forbiddenBid;
}

/**
 * The next selectable bid one step up (+1) or down (-1), skipping the forbidden bid;
 * null when the step would leave the 0..maxBid range.
 */
export function stepBid(current: number, direction: 1 | -1, { maxBid, forbiddenBid }: BidRange): number | null {
  let next = current + direction;
  if (next === forbiddenBid) next += direction;
  return next >= 0 && next <= maxBid ? next : null;
}

/**
 * The bid the selector shows and submits: the player's pick, kept in range and moved off the
 * forbidden bid (the hook rule only applies once the last bidder is up, so a pick made earlier
 * can become forbidden). Prefers the next lower bid, like the bots and the stepper do.
 */
export function resolveSelectableBid(pickedBid: number, range: BidRange): number {
  const inRange = Math.min(Math.max(pickedBid, 0), range.maxBid);
  if (inRange !== range.forbiddenBid) return inRange;
  return stepBid(inRange, -1, range) ?? stepBid(inRange, 1, range) ?? inRange;
}

export interface BidSummary {
  /** Sum of the bids placed so far */
  totalBids: number;
  /** Number of players who have bid */
  bidsPlaced: number;
}

export function getBidSummary(players: readonly IPlayer[]): BidSummary {
  let totalBids = 0;
  let bidsPlaced = 0;
  for (const player of players) {
    if (player.bid === null) continue;
    totalBids += player.bid;
    bidsPlaced += 1;
  }
  return { totalBids, bidsPlaced };
}

/**
 * Horizontal scroll position that reveals the item spanning [start, end] in a scroller showing
 * [scrollLeft, scrollLeft + viewportWidth]; unchanged when it is already fully visible.
 */
export function getScrollLeftToReveal(start: number, end: number, scrollLeft: number, viewportWidth: number): number {
  if (start < scrollLeft) return start;
  if (end > scrollLeft + viewportWidth) return Math.max(0, end - viewportWidth);
  return scrollLeft;
}
