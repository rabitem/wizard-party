/**
 * Expansions view model
 *
 * Pure helpers that turn a room's special-card selection into what the lobby
 * renders (edition presets, card rows, compact summaries) and that apply edits
 * back onto a ruleset config. All names and rule text come from the domain
 * card catalog and expansion sets.
 */

import {
  CLASSIC_DECK_SIZE,
  EXPANSION_SETS,
  SPECIAL_CARD_TYPES,
  findMatchingExpansionSet,
  getCardCatalogEntry,
  getExpansionSet,
  getPairedSpecialCard,
  normalizeSpecialCards,
  toggleSpecialCard,
  type ExpansionSetId,
  type IExpansionSet,
  type IRulesetConfig,
  type SpecialCardType,
} from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';

export interface ExpansionPresetOption {
  id: ExpansionSetId;
  name: string;
  year: number | null;
  description: string;
  cardCount: number;
  isActive: boolean;
}

export interface SpecialCardRow {
  type: SpecialCardType;
  name: string;
  germanName: string;
  rank: string;
  rules: string;
  asTrumpCard: string;
  enabled: boolean;
  /** The card this one is always enabled/disabled together with. */
  pairedWith: { type: SpecialCardType; name: string } | null;
}

export interface ExpansionsViewModel {
  selection: SpecialCardType[];
  /** The edition matching the selection exactly, or null for a custom mix. */
  activeSet: IExpansionSet | null;
  isCustom: boolean;
  presets: ExpansionPresetOption[];
  cards: SpecialCardRow[];
  enabledCount: number;
  deckSize: number;
}

export interface ExpansionSummary {
  /** Badge text, e.g. "30th Anniversary deck" or "Custom deck". */
  label: string;
  setName: string | null;
  cardNames: string[];
}

function buildCardRow(type: SpecialCardType, selected: ReadonlySet<SpecialCardType>): SpecialCardRow {
  const entry = getCardCatalogEntry(type);
  const partner = getPairedSpecialCard(type);
  return {
    type,
    name: entry.name,
    germanName: entry.germanName,
    rank: entry.rank,
    rules: entry.rules,
    asTrumpCard: entry.asTrumpCard,
    enabled: selected.has(type),
    pairedWith: partner ? { type: partner, name: getCardCatalogEntry(partner).name } : null,
  };
}

export function buildExpansionsViewModel(specialCards: readonly SpecialCardType[]): ExpansionsViewModel {
  const selection = normalizeSpecialCards(specialCards);
  const selected = new Set(selection);
  const activeSet = findMatchingExpansionSet(selection);

  return {
    selection,
    activeSet,
    isCustom: activeSet === null,
    presets: EXPANSION_SETS.map((set) => ({
      id: set.id,
      name: set.name,
      year: set.year,
      description: set.description,
      cardCount: set.cards.length,
      isActive: set.id === activeSet?.id,
    })),
    cards: SPECIAL_CARD_TYPES.map((type) => buildCardRow(type, selected)),
    enabledCount: selection.length,
    deckSize: CLASSIC_DECK_SIZE + selection.length,
  };
}

export function withSpecialCards(
  config: IRulesetConfig,
  specialCards: readonly SpecialCardType[]
): IRulesetConfig {
  return { ...config, expansions: { specialCards: normalizeSpecialCards(specialCards) } };
}

export function applyExpansionSet(config: IRulesetConfig, setId: ExpansionSetId): IRulesetConfig {
  return withSpecialCards(config, getExpansionSet(setId).cards);
}

export function applySpecialCardToggle(
  config: IRulesetConfig,
  type: SpecialCardType,
  enabled: boolean
): IRulesetConfig {
  return withSpecialCards(config, toggleSpecialCard(config.expansions.specialCards, type, enabled));
}

/** Compact description of the special cards in play, or null for the classic deck. */
export function getExpansionSummary(specialCards: readonly SpecialCardType[]): ExpansionSummary | null {
  const selection = normalizeSpecialCards(specialCards);
  if (selection.length === 0) return null;

  const set = findMatchingExpansionSet(selection);
  const setName = set?.name ?? null;
  return {
    label: `${setName ?? EXPANSIONS_UI_CONFIG.CUSTOM_SET_LABEL} ${EXPANSIONS_UI_CONFIG.DECK_LABEL_SUFFIX}`,
    setName,
    cardNames: selection.map((type) => getCardCatalogEntry(type).name),
  };
}
