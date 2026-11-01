/**
 * Trick Resolver
 *
 * The one place that decides who wins a trick. Works on card behaviours, so it is
 * the same for the server, the client and every bot simulation.
 *
 * Order of strength:
 *   Dragon > Wizard > suited cards (trump > lead suit > others) > Jester > Fairy > Witch > Bomb
 * with two exceptions that need the whole trick:
 *   - a trick holding the Dragon is won by the Fairy if she is in it too;
 *   - a trick holding a Bomb is won by nobody; the would-be winner leads next.
 */

import type { Suit } from '../value-objects/card-types';
import { DEFAULT_CARD_RULES, type ICardRules } from '../value-objects/ruleset-config';
import { TrickEffectKind, TrickRank, hasEffect, type CardBehavior } from './card-behavior';
import { getLeadSuit } from './card-rules';

export interface IResolvedPlay {
  readonly playerId: string;
  readonly behavior: CardBehavior;
}

export interface TrickResolution {
  /** Index of the deciding play: the winner, or the would-be winner of a voided trick. */
  readonly decidingIndex: number;
  /** Player credited with the trick; null when the trick is voided. */
  readonly winnerId: string | null;
  /** Player who leads the next trick. */
  readonly leaderId: string;
  readonly voided: boolean;
  readonly leadSuit: Suit | null;
}

/** Pairwise strength of each rank, higher is stronger. */
const RANK_STRENGTH: Record<TrickRank, number> = {
  [TrickRank.DRAGON]: 6,
  [TrickRank.WIZARD]: 5,
  [TrickRank.SUITED]: 4,
  [TrickRank.JESTER]: 3,
  [TrickRank.FAIRY]: 2,
  [TrickRank.WITCH]: 1,
  [TrickRank.BOMB]: 0,
};

/** Low cards are decided by class, strongest first. */
const LOW_RANK_ORDER: readonly TrickRank[] = [
  TrickRank.JESTER,
  TrickRank.FAIRY,
  TrickRank.WITCH,
  TrickRank.BOMB,
];

function indexOfRank(plays: readonly IResolvedPlay[], rank: TrickRank, fromEnd = false): number {
  if (!fromEnd) return plays.findIndex((play) => play.behavior.rank === rank);
  for (let i = plays.length - 1; i >= 0; i--) {
    if (plays[i].behavior.rank === rank) return i;
  }
  return -1;
}

/**
 * Whether suited card `a` beats the current best suited card `b`.
 */
function suitedBeats(a: CardBehavior, b: CardBehavior, leadSuit: Suit | null, trumpSuit: Suit | null): boolean {
  const aTrump = trumpSuit !== null && a.suit === trumpSuit;
  const bTrump = trumpSuit !== null && b.suit === trumpSuit;
  if (aTrump !== bTrump) return aTrump;

  if (!aTrump) {
    const aLead = a.suit === leadSuit;
    const bLead = b.suit === leadSuit;
    if (aLead !== bLead) return aLead;
  }

  return a.suit === b.suit && a.value > b.value;
}

function findDecidingIndex(
  plays: readonly IResolvedPlay[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  rules: ICardRules
): number {
  const dragon = indexOfRank(plays, TrickRank.DRAGON);
  if (dragon !== -1) {
    const fairy = indexOfRank(plays, TrickRank.FAIRY);
    return fairy !== -1 ? fairy : dragon;
  }

  const wizard = indexOfRank(plays, TrickRank.WIZARD, rules.lastWizardWins);
  if (wizard !== -1) return wizard;

  let best = -1;
  plays.forEach((play, index) => {
    if (play.behavior.rank !== TrickRank.SUITED) return;
    if (best === -1 || suitedBeats(play.behavior, plays[best].behavior, leadSuit, trumpSuit)) {
      best = index;
    }
  });
  if (best !== -1) return best;

  const allJesters = plays.every((play) => play.behavior.rank === TrickRank.JESTER);
  if (allJesters && rules.lastJesterWins) return plays.length - 1;

  for (const rank of LOW_RANK_ORDER) {
    const index = indexOfRank(plays, rank);
    if (index !== -1) return index;
  }
  return 0;
}

export function resolveTrick(
  plays: readonly IResolvedPlay[],
  trumpSuit: Suit | null,
  rules: ICardRules = DEFAULT_CARD_RULES
): TrickResolution {
  if (plays.length === 0) {
    throw new Error('Cannot determine winner of empty trick');
  }

  const leadSuit = getLeadSuit(plays.map((play) => play.behavior));
  const decidingIndex = findDecidingIndex(plays, leadSuit, trumpSuit, rules);
  const voided = plays.some((play) => hasEffect(play.behavior, TrickEffectKind.VOID_TRICK));
  const decidingPlayerId = plays[decidingIndex].playerId;

  return {
    decidingIndex,
    winnerId: voided ? null : decidingPlayerId,
    leaderId: decidingPlayerId,
    voided,
    leadSuit,
  };
}

/**
 * Whether `challenger`, played after `holder`, takes the trick from it. A pairwise
 * view for heuristics with a known lead suit; use resolveTrick for whole tricks
 * (the Bomb and the Fairy/Dragon rule depend on every card in the trick).
 */
export function behaviorBeats(
  challenger: CardBehavior,
  holder: CardBehavior,
  leadSuit: Suit | null,
  trumpSuit: Suit | null
): boolean {
  if (challenger.rank === TrickRank.FAIRY && holder.rank === TrickRank.DRAGON) return true;
  if (challenger.rank === TrickRank.DRAGON && holder.rank === TrickRank.FAIRY) return false;
  if (challenger.rank !== holder.rank) {
    return RANK_STRENGTH[challenger.rank] > RANK_STRENGTH[holder.rank];
  }
  return challenger.rank === TrickRank.SUITED && suitedBeats(challenger, holder, leadSuit, trumpSuit);
}

/**
 * Whether adding `candidate` to a partial trick would make it the deciding card
 * (the card that wins, or would win if the trick were not voided). Bots use this
 * to evaluate moves without caring about the rest of the trick.
 */
export function wouldTakeLead(
  partial: readonly IResolvedPlay[],
  candidate: IResolvedPlay,
  trumpSuit: Suit | null,
  rules: ICardRules = DEFAULT_CARD_RULES
): boolean {
  const resolution = resolveTrick([...partial, candidate], trumpSuit, rules);
  return resolution.decidingIndex === partial.length;
}
