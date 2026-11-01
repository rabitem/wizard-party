/**
 * Credits and publisher sources for the Wizard expansion editions.
 * Kept in presentation config so the domain expansion sets stay free of links.
 */

import { ExpansionSetId } from '@shared/domain';

export interface ExpansionSource {
  label: string;
  url: string;
}

export const EXPANSION_CREDITS = {
  TEXT:
    'Wizard is a card game by Ken Fisher, published in German-speaking countries by AMIGO Spiel + Freizeit GmbH. ' +
    'The special cards are based on the AMIGO anniversary editions (2016, 2021, 2026).',
  SOURCES_HEADING: 'Publisher sources',
} as const;

const SPECIAL_CARDS_EXPLAINED: ExpansionSource = {
  label: 'Special cards explained (AMIGO blog)',
  url: 'https://blog.amigo-spiele.de/2021/06/30/sonderkarten-wizard-jubilaeumsedition/',
};

const THIRTIETH_EDITION: ExpansionSource = {
  label: '30th anniversary edition (AMIGO)',
  url: 'https://www.amigo-spiele.de/kartenspiele/wizard-30-jahre-edition_2601_1258',
};

const VAMPIRE_WITCH_FAQ: ExpansionSource = {
  label: 'Vampire & Witch rules FAQ (AMIGO blog)',
  url: 'https://blog.amigo-spiele.de/2026/03/19/wizard-regel-faq/',
};

/** Publisher sources per edition; editions without an entry have none. */
export const EXPANSION_SET_SOURCES: Readonly<Partial<Record<ExpansionSetId, readonly ExpansionSource[]>>> = {
  [ExpansionSetId.JUBILEE_20]: [SPECIAL_CARDS_EXPLAINED],
  [ExpansionSetId.JUBILEE_25]: [SPECIAL_CARDS_EXPLAINED],
  [ExpansionSetId.JUBILEE_30]: [THIRTIETH_EDITION, VAMPIRE_WITCH_FAQ],
};

export function getExpansionSetSources(setId: ExpansionSetId): readonly ExpansionSource[] {
  return EXPANSION_SET_SOURCES[setId] ?? [];
}

/** Every source across all editions, once each, in edition order. */
export function getAllExpansionSources(): ExpansionSource[] {
  const seen = new Set<string>();
  const sources: ExpansionSource[] = [];
  for (const setSources of Object.values(EXPANSION_SET_SOURCES)) {
    for (const source of setSources ?? []) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      sources.push(source);
    }
  }
  return sources;
}
