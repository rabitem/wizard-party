/**
 * Trick Lead
 *
 * The lead of a trick is an explicit three-state value instead of `Suit | null`,
 * because "nobody has set a suit yet" and "nobody has to follow suit" are
 * different situations with different futures:
 *
 *   pending - only Jesters (or other powerless cards) were played so far; the next
 *             number card still sets the suit to follow
 *   free    - a Wizard (or the Dragon) was played before any suited card; nobody
 *             has to follow suit for the rest of the trick
 *   suit    - a suited card set the suit everyone has to follow
 *
 * `leadSuitOf` collapses the lead to the wire format (`ITrick.leadSuit`), where
 * pending and free both read as null.
 */

import type { Suit } from '../value-objects/card-types';
import { TrickRank, type CardBehavior } from './card-behavior';

export const TrickLeadKind = {
  PENDING: 'pending',
  FREE: 'free',
  SUIT: 'suit',
} as const;

export type TrickLead =
  | { readonly kind: typeof TrickLeadKind.PENDING }
  | { readonly kind: typeof TrickLeadKind.FREE }
  | { readonly kind: typeof TrickLeadKind.SUIT; readonly suit: Suit };

/** No card set the lead yet (empty trick, or only Jesters so far). */
export const PENDING_LEAD: TrickLead = Object.freeze({ kind: TrickLeadKind.PENDING });

/** A Wizard (or Dragon) came first: everyone may play any card. */
export const FREE_LEAD: TrickLead = Object.freeze({ kind: TrickLeadKind.FREE });

export function suitLead(suit: Suit): TrickLead {
  return { kind: TrickLeadKind.SUIT, suit };
}

/** Ranks that free the trick when played before any suited card. */
const FREEING_RANKS: ReadonlySet<TrickRank> = new Set([TrickRank.WIZARD, TrickRank.DRAGON]);

/**
 * The lead after one more card. Only a pending lead can change: a Wizard frees
 * the trick, a suited card sets its suit, everything else leaves it pending.
 */
export function advanceLead(lead: TrickLead, behavior: CardBehavior): TrickLead {
  if (lead.kind !== TrickLeadKind.PENDING) return lead;
  if (FREEING_RANKS.has(behavior.rank)) return FREE_LEAD;
  if (behavior.rank !== TrickRank.SUITED) return lead;
  // A suited card without a suit (an undeclared Cloud/Juggler) cannot be followed.
  return behavior.suit ? suitLead(behavior.suit) : FREE_LEAD;
}

/** The lead of a trick from its cards' behaviours, in play order. */
export function leadOf(behaviors: readonly CardBehavior[]): TrickLead {
  let lead = PENDING_LEAD;
  for (const behavior of behaviors) {
    lead = advanceLead(lead, behavior);
    if (lead.kind !== TrickLeadKind.PENDING) return lead;
  }
  return lead;
}

/** The suit players have to follow, or null when they may play anything. */
export function leadSuitOf(lead: TrickLead): Suit | null {
  return lead.kind === TrickLeadKind.SUIT ? lead.suit : null;
}
