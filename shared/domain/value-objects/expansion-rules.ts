/**
 * Expansion Rules
 *
 * Which expansion special cards are shuffled into the deck. The behaviour of each
 * card lives in `shared/domain/expansions`; this value object only describes the
 * room's selection and keeps it valid.
 */

import {
  CardType,
  SPECIAL_CARD_TYPES,
  isSpecialCardType,
  type SpecialCardType,
} from './card-types';

export interface IExpansionRules {
  /**
   * Special cards added to the classic 60-card deck (one copy each).
   * Empty means the classic game.
   */
  specialCards: SpecialCardType[];
}

export const DEFAULT_EXPANSION_RULES: IExpansionRules = {
  specialCards: [],
};

/**
 * Cards that only make sense together. The published rules ask groups that play a
 * subset of special cards to use Dragon and Fairy both or neither: the Fairy is the
 * only answer to the Dragon.
 */
export const SPECIAL_CARD_PAIRS: readonly (readonly [SpecialCardType, SpecialCardType])[] = [
  [CardType.DRAGON, CardType.FAIRY],
];

export function getPairedSpecialCard(type: SpecialCardType): SpecialCardType | null {
  for (const [a, b] of SPECIAL_CARD_PAIRS) {
    if (a === type) return b;
    if (b === type) return a;
  }
  return null;
}

/**
 * Normalize a special-card selection: drop unknown or duplicate entries, complete
 * pairs and order the result canonically so equal selections compare equal.
 */
export function normalizeSpecialCards(value: unknown): SpecialCardType[] {
  if (!Array.isArray(value)) return [...DEFAULT_EXPANSION_RULES.specialCards];

  const selected = new Set<SpecialCardType>(value.filter(isSpecialCardType));
  for (const type of [...selected]) {
    const partner = getPairedSpecialCard(type);
    if (partner) selected.add(partner);
  }
  return SPECIAL_CARD_TYPES.filter((type) => selected.has(type));
}

export function ensureExpansionRules(value: unknown): IExpansionRules {
  const specialCards = typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>).specialCards
    : undefined;
  return { specialCards: normalizeSpecialCards(specialCards) };
}

/**
 * Toggle one card (and its pair partner) in a selection.
 */
export function toggleSpecialCard(
  selection: readonly SpecialCardType[],
  type: SpecialCardType,
  enabled: boolean
): SpecialCardType[] {
  const partner = getPairedSpecialCard(type);
  const affected = new Set<SpecialCardType>(partner ? [type, partner] : [type]);
  const next = selection.filter((card) => !affected.has(card));
  return normalizeSpecialCards(enabled ? [...next, ...affected] : next);
}

export function areSpecialCardSelectionsEqual(
  a: readonly SpecialCardType[],
  b: readonly SpecialCardType[]
): boolean {
  const left = normalizeSpecialCards(a);
  const right = normalizeSpecialCards(b);
  return left.length === right.length && left.every((type, index) => type === right[index]);
}
