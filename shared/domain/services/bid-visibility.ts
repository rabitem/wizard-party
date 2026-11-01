/**
 * Bid Visibility Policy
 * Single responsibility: decide which bidding information a seat may see.
 *
 * With the hidden-bids rule, players see only their own bid until everyone has
 * bid. The forbidden bid of the hook rule encodes the sum of the other bids, so
 * it is hidden too, except from the player it restricts (who needs it to bid).
 * The state projection for humans and the bots' game context both use this one
 * policy, so a bot never knows more than a human in its seat.
 */

import { type IBiddingRules } from '../value-objects/ruleset-config';
import { shouldShowBids } from './rule-appliers';

export interface BidVisibilityInput {
  biddingRules: IBiddingRules;
  /** Every player at the table has bid this round. */
  allBidsPlaced: boolean;
  /** The seat looking at the game. */
  viewerId: string;
  /** The player the forbidden bid applies to (the one about to bid), if any. */
  restrictedBidderId: string | null;
}

export interface IBidVisibilityPolicy {
  /** Whether the viewer may see this player's bid. */
  canSeeBid(ownerId: string): boolean;
  /** Whether the viewer may see the forbidden bid. */
  canSeeForbiddenBid(): boolean;
}

export function createBidVisibilityPolicy(input: BidVisibilityInput): IBidVisibilityPolicy {
  // The same rule decides whether BID_PLACED events are broadcast.
  const bidsPublic = shouldShowBids(input.biddingRules, input.allBidsPlaced);
  return {
    canSeeBid: (ownerId) => bidsPublic || ownerId === input.viewerId,
    canSeeForbiddenBid: () => bidsPublic || input.restrictedBidderId === input.viewerId,
  };
}
