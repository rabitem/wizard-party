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
 * Card type enumeration
 */
export enum CardType {
  NUMBER = 'NUMBER',
  WIZARD = 'WIZARD',
  JESTER = 'JESTER',
}

/**
 * Classic Wizard card game colors for each suit
 */
export const SUIT_COLORS: Record<Suit, string> = {
  [Suit.GIANTS]: '#228B22',
  [Suit.ELVES]: '#1E90FF',
  [Suit.DWARVES]: '#DC4405',
  [Suit.HUMANS]: '#DAA520',
};

/**
 * Unicode symbols representing each fantasy race
 */
export const SUIT_SYMBOLS: Record<Suit, string> = {
  [Suit.GIANTS]: '⛰',
  [Suit.ELVES]: '✦',
  [Suit.DWARVES]: '⚒',
  [Suit.HUMANS]: '⚔',
};

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
 * Background accent colors for card backgrounds
 */
export const SUIT_BG_COLORS: Record<Suit, string> = {
  [Suit.GIANTS]: '#e8f5e9',
  [Suit.ELVES]: '#e3f2fd',
  [Suit.DWARVES]: '#fff3e0',
  [Suit.HUMANS]: '#fffde7',
};

/**
 * All suits as an array for iteration
 */
export const ALL_SUITS: Suit[] = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];
