/**
 * Card Catalog
 *
 * Names and rule summaries for every card type, shared by the lobby, the help
 * screens, card faces and notifications so the wording never drifts.
 */

import { CardType } from '../value-objects/card-types';

export interface ICardCatalogEntry {
  type: CardType;
  /** English display name. */
  name: string;
  /** Name in the German AMIGO edition. */
  germanName: string;
  /** One-letter corner index for compact card faces. */
  cornerLabel: string;
  /** Rank in one line, e.g. "Beats Wizards". */
  rank: string;
  /** Full rule summary shown in the lobby and help screens. */
  rules: string;
  /** Effect when the card is turned up as trump card. */
  asTrumpCard: string;
}

const CATALOG: Record<CardType, ICardCatalogEntry> = {
  [CardType.NUMBER]: {
    type: CardType.NUMBER,
    name: 'Number card',
    germanName: 'Zahlenkarte',
    cornerLabel: '#',
    rank: '1-13 in four suits',
    rules: 'Follow the lead suit if you can. Trump beats the lead suit; higher numbers win.',
    asTrumpCard: 'Its suit is trump.',
  },
  [CardType.WIZARD]: {
    type: CardType.WIZARD,
    name: 'Wizard',
    germanName: 'Zauberer',
    cornerLabel: 'W',
    rank: 'Beats every suit card',
    rules: 'May always be played. The first Wizard in a trick wins it. Leading a Wizard frees everyone from following suit.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.JESTER]: {
    type: CardType.JESTER,
    name: 'Jester',
    germanName: 'Narr',
    cornerLabel: 'J',
    rank: 'Loses to every suit card',
    rules: 'May always be played. Only wins a trick made of nothing but low cards.',
    asTrumpCard: 'No trump this round.',
  },
  [CardType.DRAGON]: {
    type: CardType.DRAGON,
    name: 'Dragon',
    germanName: 'Drache',
    cornerLabel: 'D',
    rank: 'Highest card - beats Wizards',
    rules: 'May always be played. Wins every trick it is in, unless the Fairy is in the same trick.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.FAIRY]: {
    type: CardType.FAIRY,
    name: 'Fairy',
    germanName: 'Fee',
    cornerLabel: 'F',
    rank: 'Below the Jester, above the Witch - and beats the Dragon',
    rules: 'May always be played. Loses to every card but the Witch, even to a Jester - but wins any trick that holds the Dragon.',
    asTrumpCard: 'No trump this round.',
  },
  [CardType.BOMB]: {
    type: CardType.BOMB,
    name: 'Bomb',
    germanName: 'Bombe',
    cornerLabel: 'B',
    rank: 'Destroys the trick',
    rules: 'May always be played. Nobody wins a trick with the Bomb in it; the player of the would-be winning card leads next.',
    asTrumpCard: 'No trump this round.',
  },
  [CardType.WEREWOLF]: {
    type: CardType.WEREWOLF,
    name: 'Werewolf',
    germanName: 'Werwolf',
    cornerLabel: 'Ww',
    rank: 'Steals the trump card',
    rules: 'Before bidding, its holder swaps it for the turned-up trump card and names the trump suit - or no trump.',
    asTrumpCard: 'Set aside; the next card is turned up.',
  },
  [CardType.JUGGLER]: {
    type: CardType.JUGGLER,
    name: 'Juggler',
    germanName: 'Jongleur',
    cornerLabel: '7½',
    rank: '7½ in a suit of your choice',
    rules: 'Announce its suit (trump allowed) when you play it. After the trick every player passes one hand card to the left.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.CLOUD]: {
    type: CardType.CLOUD,
    name: 'Cloud',
    germanName: 'Wolke',
    cornerLabel: '9¾',
    rank: '9¾ in a suit of your choice',
    rules: 'Announce its suit (trump allowed) when you play it. Whoever wins its trick must raise or lower their bid by one.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.SHAPESHIFTER]: {
    type: CardType.SHAPESHIFTER,
    name: 'Shapeshifter',
    germanName: 'Gestaltwandler',
    cornerLabel: 'S',
    rank: 'Wizard or Jester',
    rules: 'May always be played. When you play it, decide whether it counts as a Wizard or as a Jester.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.VAMPIRE]: {
    type: CardType.VAMPIRE,
    name: 'Vampire',
    germanName: 'Vampir',
    cornerLabel: 'V',
    rank: 'Copies the trump card',
    rules: 'Becomes a copy of the turned-up trump card, effects included. Never has to follow suit.',
    asTrumpCard: 'The dealer chooses trump.',
  },
  [CardType.WITCH]: {
    type: CardType.WITCH,
    name: 'Witch',
    germanName: 'Hexe',
    cornerLabel: 'H',
    rank: 'Below Jester and Fairy',
    rules: 'May always be played. After the trick is decided, put a hand card into it and take any other card from it into your hand.',
    asTrumpCard: 'No trump this round.',
  },
};

export function getCardCatalogEntry(type: CardType): ICardCatalogEntry {
  return CATALOG[type] ?? CATALOG[CardType.NUMBER];
}

export const CARD_CATALOG: Readonly<Record<CardType, ICardCatalogEntry>> = CATALOG;
