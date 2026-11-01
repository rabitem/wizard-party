/**
 * Expansion Sets
 *
 * The special-card collections of the published editions, as presets for the lobby.
 * Rooms store the resulting card list (IExpansionRules.specialCards), so a set can be
 * tweaked card by card and new sets can be added here without migrating stored rooms.
 */

import { CardType, SPECIAL_CARD_TYPES, type SpecialCardType } from '../value-objects/card-types';
import { areSpecialCardSelectionsEqual } from '../value-objects/expansion-rules';

export enum ExpansionSetId {
  CLASSIC = 'CLASSIC',
  JUBILEE_20 = 'JUBILEE_20',
  JUBILEE_25 = 'JUBILEE_25',
  JUBILEE_30 = 'JUBILEE_30',
}

export interface IExpansionSet {
  id: ExpansionSetId;
  name: string;
  /** Year of the AMIGO edition that introduced the set. */
  year: number | null;
  description: string;
  cards: readonly SpecialCardType[];
}

const JUBILEE_20_CARDS: readonly SpecialCardType[] = [
  CardType.DRAGON,
  CardType.FAIRY,
  CardType.BOMB,
  CardType.WEREWOLF,
  CardType.JUGGLER,
  CardType.CLOUD,
];

const JUBILEE_25_CARDS: readonly SpecialCardType[] = [...JUBILEE_20_CARDS, CardType.SHAPESHIFTER];

export const EXPANSION_SETS: readonly IExpansionSet[] = [
  {
    id: ExpansionSetId.CLASSIC,
    name: 'Classic',
    year: null,
    description: '60 cards: four suits, four Wizards, four Jesters.',
    cards: [],
  },
  {
    id: ExpansionSetId.JUBILEE_20,
    name: '20th Anniversary',
    year: 2016,
    description: 'Dragon, Fairy, Bomb, Werewolf, Juggler and Cloud join the deck.',
    cards: JUBILEE_20_CARDS,
  },
  {
    id: ExpansionSetId.JUBILEE_25,
    name: '25th Anniversary',
    year: 2021,
    description: 'The 20th anniversary cards plus the Shapeshifter.',
    cards: JUBILEE_25_CARDS,
  },
  {
    id: ExpansionSetId.JUBILEE_30,
    name: '30th Anniversary',
    year: 2026,
    description: 'All nine special cards, including the Vampire and the Witch this edition introduced.',
    cards: SPECIAL_CARD_TYPES,
  },
];

export function getExpansionSet(id: ExpansionSetId): IExpansionSet {
  return EXPANSION_SETS.find((set) => set.id === id) ?? EXPANSION_SETS[0];
}

/** The preset that matches a selection exactly, or null for a custom mix. */
export function findMatchingExpansionSet(selection: readonly SpecialCardType[]): IExpansionSet | null {
  return EXPANSION_SETS.find((set) => areSpecialCardSelectionsEqual(set.cards, selection)) ?? null;
}
