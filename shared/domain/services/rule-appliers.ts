/**
 * Rule Appliers Service
 *
 * Bid visibility under the hidden-bids rule. Round counts, forbidden bids and
 * scoring live in expansions/round-rules.ts; trick winners in
 * expansions/trick-resolver.ts.
 */

import { type IBiddingRules, DEFAULT_BIDDING_RULES } from '../value-objects/ruleset-config';

/**
 * Check if bids should be visible to other players
 *
 * @param rules - Bidding rules from ruleset config
 * @param allPlayersHaveBid - Whether all players have placed their bids
 * @returns Whether bids should be shown
 */
export function shouldShowBids(
  rules: IBiddingRules = DEFAULT_BIDDING_RULES,
  allPlayersHaveBid: boolean
): boolean {
  if (!rules.hiddenBids) {
    return true; // Always show if not hidden
  }
  return allPlayersHaveBid; // Only show after all have bid
}
