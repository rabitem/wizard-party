/**
 * Card Definitions
 *
 * The single source of truth for how every card type behaves. Rule engines
 * (trick resolution, follow suit, trump reveal, trick effects, hand sorting, bots,
 * rendering metadata) read this registry instead of switching on card types.
 *
 * Adding a new special card:
 * 1. Add the type to `CardType` / `SPECIAL_CARD_TYPES` (value-objects/card-types.ts).
 * 2. Add its definition here and its glossary entry in card-catalog.ts.
 * 3. Add it to an expansion set (expansion-sets.ts) if it ships with one.
 * 4. Draw its face (src/presentation/utils/card-textures/special-cards).
 * New trick effects additionally need a handler in trick-effects.ts.
 *
 * Rules follow the AMIGO anniversary editions (2016, 2021, 2026 rule FAQ).
 */

import { CardType, type Suit } from '../value-objects/card-types';
import {
  CardForm,
  DeclarationKind,
  TrickEffectKind,
  TrickRank,
  type CardBehavior,
  type ICardDeclaration,
} from './card-behavior';

/** What happens to trump when this card is turned up after dealing. */
export enum TrumpRevealOutcome {
  /** The card's own suit is trump (number cards). */
  OWN_SUIT = 'OWN_SUIT',
  /** No trump this round. */
  NO_TRUMP = 'NO_TRUMP',
  /** The dealer chooses a trump suit. */
  DEALER_CHOOSES = 'DEALER_CHOOSES',
  /** The card is set aside and the next card is turned up (Werewolf). */
  REVEAL_NEXT = 'REVEAL_NEXT',
}

export interface ICardDefinition {
  readonly type: CardType;
  /** Copies in the deck when the card is part of the game. */
  readonly copies: number;
  /** Choice the player must announce when playing the card. */
  readonly declaration: DeclarationKind | null;
  /** May be played even when the player could follow the lead suit. */
  readonly alwaysPlayable: boolean;
  readonly trumpReveal: TrumpRevealOutcome;
  /**
   * Before bidding, the holder swaps this card with the turned-up trump card and
   * chooses trump (Werewolf).
   */
  readonly swapsWithTrumpCard: boolean;
  /** The card takes on the identity of the turned-up trump card (Vampire). */
  readonly copiesTrumpCard: boolean;
  /** Hand order; lower sorts further left. Number cards are 0. */
  readonly sortOrder: number;
  /**
   * Behaviour of the physical card for a declaration. Copying cards resolve via
   * resolveCardBehavior instead.
   */
  behave(card: { suit: Suit | null; value: number | null }, declaration: ICardDeclaration): CardBehavior;
}

const NO_EFFECTS: readonly TrickEffectKind[] = [];

function behavior(
  actsAs: CardType,
  rank: TrickRank,
  options: { suit?: Suit | null; value?: number; effects?: readonly TrickEffectKind[] } = {}
): CardBehavior {
  return {
    actsAs,
    rank,
    suit: options.suit ?? null,
    value: options.value ?? 0,
    effects: options.effects ?? NO_EFFECTS,
  };
}

function fixed(actsAs: CardType, rank: TrickRank, effects?: readonly TrickEffectKind[]) {
  const resolved = behavior(actsAs, rank, { effects });
  return () => resolved;
}

/** Suit cards with a fractional value whose suit is announced on play. */
function announcedSuit(actsAs: CardType, value: number, effect: TrickEffectKind) {
  return (_card: unknown, declaration: ICardDeclaration): CardBehavior =>
    behavior(actsAs, TrickRank.SUITED, { suit: declaration.suit ?? null, value, effects: [effect] });
}

export const JUGGLER_VALUE = 7.5;
export const CLOUD_VALUE = 9.75;

const DEFINITIONS: Record<CardType, ICardDefinition> = {
  [CardType.NUMBER]: {
    type: CardType.NUMBER,
    copies: 0,
    declaration: null,
    alwaysPlayable: false,
    trumpReveal: TrumpRevealOutcome.OWN_SUIT,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: 0,
    behave: (card) => behavior(CardType.NUMBER, TrickRank.SUITED, { suit: card.suit, value: card.value ?? 0 }),
  },
  [CardType.WIZARD]: {
    type: CardType.WIZARD,
    copies: 4,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: -50,
    behave: fixed(CardType.WIZARD, TrickRank.WIZARD),
  },
  [CardType.JESTER]: {
    type: CardType.JESTER,
    copies: 4,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.NO_TRUMP,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: 50,
    behave: fixed(CardType.JESTER, TrickRank.JESTER),
  },
  // Highest card: beats Wizards and wins every trick, unless the Fairy is in it.
  [CardType.DRAGON]: {
    type: CardType.DRAGON,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: -60,
    behave: fixed(CardType.DRAGON, TrickRank.DRAGON),
  },
  // Lowest card (below the Jester) - but it wins any trick that holds the Dragon.
  [CardType.FAIRY]: {
    type: CardType.FAIRY,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.NO_TRUMP,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: 60,
    behave: fixed(CardType.FAIRY, TrickRank.FAIRY),
  },
  // Nobody wins a trick holding the Bomb; the would-be winner leads next.
  [CardType.BOMB]: {
    type: CardType.BOMB,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.NO_TRUMP,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: 40,
    behave: fixed(CardType.BOMB, TrickRank.BOMB, [TrickEffectKind.VOID_TRICK]),
  },
  // Swapped for the trump card before bidding; its holder names trump (or none).
  // Only ever played when no trump card was turned up - then it counts as a Jester.
  [CardType.WEREWOLF]: {
    type: CardType.WEREWOLF,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.REVEAL_NEXT,
    swapsWithTrumpCard: true,
    copiesTrumpCard: false,
    sortOrder: 30,
    behave: fixed(CardType.WEREWOLF, TrickRank.JESTER),
  },
  // 7 1/2 in an announced suit; afterwards everybody passes a card to the left.
  [CardType.JUGGLER]: {
    type: CardType.JUGGLER,
    copies: 1,
    declaration: DeclarationKind.SUIT,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: -10,
    behave: announcedSuit(CardType.JUGGLER, JUGGLER_VALUE, TrickEffectKind.PASS_LEFT),
  },
  // 9 3/4 in an announced suit; its trick winner changes their bid by one.
  [CardType.CLOUD]: {
    type: CardType.CLOUD,
    copies: 1,
    declaration: DeclarationKind.SUIT,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: -20,
    behave: announcedSuit(CardType.CLOUD, CLOUD_VALUE, TrickEffectKind.ADJUST_BID),
  },
  // Played as a Wizard or a Jester - the player decides when playing it.
  [CardType.SHAPESHIFTER]: {
    type: CardType.SHAPESHIFTER,
    copies: 1,
    declaration: DeclarationKind.FORM,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: -40,
    behave: (_card, declaration) =>
      declaration.form === CardForm.JESTER
        ? behavior(CardType.SHAPESHIFTER, TrickRank.JESTER)
        : behavior(CardType.SHAPESHIFTER, TrickRank.WIZARD),
  },
  // Copies the turned-up trump card including its effects. Never has to follow suit.
  [CardType.VAMPIRE]: {
    type: CardType.VAMPIRE,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.DEALER_CHOOSES,
    swapsWithTrumpCard: false,
    copiesTrumpCard: true,
    sortOrder: -30,
    // Without a card to copy (no trump card) the Vampire has no power: a Jester.
    behave: fixed(CardType.VAMPIRE, TrickRank.JESTER),
  },
  // Below Jester and Fairy. After the trick its owner swaps a hand card with a trick card.
  [CardType.WITCH]: {
    type: CardType.WITCH,
    copies: 1,
    declaration: null,
    alwaysPlayable: true,
    trumpReveal: TrumpRevealOutcome.NO_TRUMP,
    swapsWithTrumpCard: false,
    copiesTrumpCard: false,
    sortOrder: 70,
    behave: fixed(CardType.WITCH, TrickRank.WITCH, [TrickEffectKind.SWAP_WITH_TRICK]),
  },
};

export function getCardDefinition(type: CardType): ICardDefinition {
  return DEFINITIONS[type] ?? DEFINITIONS[CardType.NUMBER];
}

export const CARD_DEFINITIONS: Readonly<Record<CardType, ICardDefinition>> = DEFINITIONS;
