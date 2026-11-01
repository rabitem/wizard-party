import { describe, expect, it } from 'vitest';

import {
  CardType,
  EXPANSION_SETS,
  ExpansionSetId,
  getExpansionSet,
} from '@shared/domain';
import { getAllExpansionSources, getExpansionSetSources } from '@/presentation/config/expansion-credits.config';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';

import {
  buildExpansionExplanation,
  getExpansionYearLabel,
  getExplainableExpansionSets,
  getSwipeStep,
  wrapCarouselIndex,
} from './expansion-guide';

const THRESHOLD = EXPANSIONS_UI_CONFIG.CAROUSEL_SWIPE_THRESHOLD_PX;

describe('wrapCarouselIndex', () => {
  it('should keep in-range indexes unchanged', () => {
    expect(wrapCarouselIndex(0, 3)).toBe(0);
    expect(wrapCarouselIndex(2, 3)).toBe(2);
  });

  it('should wrap past the last slide back to the first', () => {
    expect(wrapCarouselIndex(3, 3)).toBe(0);
    expect(wrapCarouselIndex(7, 3)).toBe(1);
  });

  it('should wrap before the first slide to the last', () => {
    expect(wrapCarouselIndex(-1, 3)).toBe(2);
    expect(wrapCarouselIndex(-4, 3)).toBe(2);
  });

  it('should return 0 for an empty carousel', () => {
    expect(wrapCarouselIndex(5, 0)).toBe(0);
  });
});

describe('getSwipeStep', () => {
  it('should ignore movements shorter than the threshold', () => {
    expect(getSwipeStep(0)).toBe(0);
    expect(getSwipeStep(THRESHOLD - 1)).toBe(0);
    expect(getSwipeStep(-(THRESHOLD - 1))).toBe(0);
  });

  it('should go to the next slide on a left swipe', () => {
    expect(getSwipeStep(-THRESHOLD)).toBe(1);
  });

  it('should go to the previous slide on a right swipe', () => {
    expect(getSwipeStep(THRESHOLD)).toBe(-1);
  });

  it('should honour a custom threshold', () => {
    expect(getSwipeStep(-10, 5)).toBe(1);
    expect(getSwipeStep(-10, 20)).toBe(0);
  });
});

describe('getExplainableExpansionSets', () => {
  it('should list every edition except the classic deck', () => {
    const ids = getExplainableExpansionSets().map((set) => set.id);

    expect(ids).not.toContain(ExpansionSetId.CLASSIC);
    expect(ids).toEqual(EXPANSION_SETS.filter((set) => set.cards.length > 0).map((set) => set.id));
  });
});

describe('buildExpansionExplanation', () => {
  it('should explain the rules of all nine cards of the 30th anniversary edition and cite its sources', () => {
    const explanation = buildExpansionExplanation(ExpansionSetId.JUBILEE_30);
    const types = explanation.cards.map((card) => card.type);

    expect(explanation.name).toBe('30th Anniversary');
    expect(explanation.yearLabel).toBe('2026');
    expect(new Set(types).size).toBe(9);
    expect(types).toEqual(expect.arrayContaining([CardType.VAMPIRE, CardType.WITCH]));
    for (const card of explanation.cards) {
      expect(card.rules.trim()).not.toBe('');
    }
    expect(explanation.sources.map((source) => source.url)).toEqual([
      'https://www.amigo-spiele.de/kartenspiele/wizard-30-jahre-edition_2601_1258',
      'https://blog.amigo-spiele.de/2026/03/19/wizard-regel-faq/',
    ]);
  });

  it('should label the base game when an edition has no year', () => {
    expect(getExpansionYearLabel(getExpansionSet(ExpansionSetId.CLASSIC))).toBe(
      EXPANSIONS_UI_CONFIG.ORIGINAL_EDITION_LABEL
    );
  });
});

describe('expansion credits config', () => {
  it('should credit official sources for every anniversary edition', () => {
    for (const set of getExplainableExpansionSets()) {
      expect(getExpansionSetSources(set.id).length).toBeGreaterThan(0);
    }
    expect(getExpansionSetSources(ExpansionSetId.CLASSIC)).toEqual([]);
  });

  it('should only link to https URLs on AMIGO domains', () => {
    for (const source of getAllExpansionSources()) {
      const url = new URL(source.url);
      expect(url.protocol).toBe('https:');
      expect(url.hostname.endsWith('amigo-spiele.de')).toBe(true);
    }
  });

  it('should list each shared source once', () => {
    const all = getAllExpansionSources();
    const perEdition = getExplainableExpansionSets().flatMap((set) => getExpansionSetSources(set.id));

    expect(all.map((source) => source.url)).toEqual([...new Set(perEdition.map((source) => source.url))]);
    expect(all.length).toBeLessThan(perEdition.length);
  });
});
