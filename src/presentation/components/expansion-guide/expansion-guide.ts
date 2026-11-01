/**
 * Expansion guide helpers
 *
 * Pure functions behind the expansion explainer and the home-page carousel. Card
 * text comes from the domain card catalog; sources from the credits config.
 */

import {
  EXPANSION_SETS,
  ExpansionSetId,
  getCardCatalogEntry,
  getExpansionSet,
  type ICardCatalogEntry,
  type IExpansionSet,
} from '@shared/domain';
import { getExpansionSetSources, type ExpansionSource } from '@/presentation/config/expansion-credits.config';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';

export interface ExpansionExplanation {
  id: ExpansionSetId;
  name: string;
  yearLabel: string;
  description: string;
  cards: ICardCatalogEntry[];
  sources: readonly ExpansionSource[];
}

/** Editions that add special cards (the classic deck has nothing to explain). */
export function getExplainableExpansionSets(): IExpansionSet[] {
  return EXPANSION_SETS.filter((set) => set.id !== ExpansionSetId.CLASSIC);
}

export function getExpansionYearLabel(set: IExpansionSet): string {
  return set.year === null ? EXPANSIONS_UI_CONFIG.ORIGINAL_EDITION_LABEL : String(set.year);
}

export function buildExpansionExplanation(setId: ExpansionSetId): ExpansionExplanation {
  const set = getExpansionSet(setId);
  return {
    id: set.id,
    name: set.name,
    yearLabel: getExpansionYearLabel(set),
    description: set.description,
    cards: set.cards.map((type) => getCardCatalogEntry(type)),
    sources: getExpansionSetSources(set.id),
  };
}

/** Wraps any index (negative or past the end) into [0, length). */
export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

/**
 * Slide step for a horizontal swipe: 1 for a swipe left (next), -1 for a swipe
 * right (previous), 0 when the movement is shorter than the threshold.
 */
export function getSwipeStep(deltaX: number, thresholdPx: number = EXPANSIONS_UI_CONFIG.CAROUSEL_SWIPE_THRESHOLD_PX): -1 | 0 | 1 {
  if (Math.abs(deltaX) < thresholdPx) return 0;
  return deltaX < 0 ? 1 : -1;
}
