/**
 * Card suit enumeration representing the four fantasy races in Wizard card game
 */
export enum Suit {
  GIANTS = 'GIANTS',
  ELVES = 'ELVES',
  DWARVES = 'DWARVES',
  HUMANS = 'HUMANS',
}

/**
 * Card type enumeration.
 *
 * NUMBER, WIZARD and JESTER form the classic 60-card deck. Every other type is an
 * expansion special card (based on the AMIGO anniversary editions); its behaviour is
 * defined once in `shared/domain/expansions/card-definitions.ts`.
 */
export enum CardType {
  NUMBER = 'NUMBER',
  WIZARD = 'WIZARD',
  JESTER = 'JESTER',
  // Expansion special cards
  DRAGON = 'DRAGON',
  FAIRY = 'FAIRY',
  BOMB = 'BOMB',
  WEREWOLF = 'WEREWOLF',
  JUGGLER = 'JUGGLER',
  CLOUD = 'CLOUD',
  SHAPESHIFTER = 'SHAPESHIFTER',
  VAMPIRE = 'VAMPIRE',
  WITCH = 'WITCH',
}

/** Card types that only exist when an expansion enables them. */
export type SpecialCardType = Exclude<CardType, CardType.NUMBER | CardType.WIZARD | CardType.JESTER>;

/** Every expansion special card, in the order they are presented in the UI. */
export const SPECIAL_CARD_TYPES: readonly SpecialCardType[] = [
  CardType.DRAGON,
  CardType.FAIRY,
  CardType.BOMB,
  CardType.WEREWOLF,
  CardType.JUGGLER,
  CardType.CLOUD,
  CardType.SHAPESHIFTER,
  CardType.VAMPIRE,
  CardType.WITCH,
];

const SPECIAL_CARD_TYPE_SET: ReadonlySet<string> = new Set(SPECIAL_CARD_TYPES);

export function isSpecialCardType(type: unknown): type is SpecialCardType {
  return typeof type === 'string' && SPECIAL_CARD_TYPE_SET.has(type);
}

/**
 * Display names for the suits
 */
export const SUIT_NAMES: Record<Suit, string> = {
  [Suit.GIANTS]: 'Giants',
  [Suit.ELVES]: 'Elves',
  [Suit.DWARVES]: 'Dwarves',
  [Suit.HUMANS]: 'Humans',
};

/**
 * All suits as an array for iteration
 */
export const ALL_SUITS: Suit[] = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];
