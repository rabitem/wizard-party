import { describe, expect, it } from 'vitest';

import {
  CLASSIC_DECK_SIZE,
  CardType,
  DEFAULT_RULESET_CONFIG,
  ExpansionSetId,
  SPECIAL_CARD_TYPES,
  getCardCatalogEntry,
  getExpansionSet,
} from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';

import {
  applyExpansionSet,
  applySpecialCardToggle,
  buildExpansionsViewModel,
  getExpansionSummary,
  withSpecialCards,
} from './expansions-view-model';

describe('expansions view model: buildExpansionsViewModel', () => {
  it('should highlight the classic preset for an empty selection', () => {
    const viewModel = buildExpansionsViewModel([]);

    expect(viewModel.activeSet?.id).toBe(ExpansionSetId.CLASSIC);
    expect(viewModel.isCustom).toBe(false);
    expect(viewModel.enabledCount).toBe(0);
    expect(viewModel.deckSize).toBe(CLASSIC_DECK_SIZE);
    expect(viewModel.presets.filter((preset) => preset.isActive).map((preset) => preset.id)).toEqual([
      ExpansionSetId.CLASSIC,
    ]);
  });

  it('should match an anniversary preset regardless of selection order', () => {
    const cards = [...getExpansionSet(ExpansionSetId.JUBILEE_25).cards].reverse();
    const viewModel = buildExpansionsViewModel(cards);

    expect(viewModel.activeSet?.id).toBe(ExpansionSetId.JUBILEE_25);
    expect(viewModel.presets.find((preset) => preset.isActive)?.id).toBe(ExpansionSetId.JUBILEE_25);
    expect(viewModel.deckSize).toBe(CLASSIC_DECK_SIZE + cards.length);
  });

  it('should report a custom mix when no preset matches', () => {
    const viewModel = buildExpansionsViewModel([CardType.BOMB, CardType.CLOUD]);

    expect(viewModel.activeSet).toBeNull();
    expect(viewModel.isCustom).toBe(true);
    expect(viewModel.presets.some((preset) => preset.isActive)).toBe(false);
    expect(viewModel.enabledCount).toBe(2);
  });

  it('should list every special card with catalog text and enabled state', () => {
    const viewModel = buildExpansionsViewModel([CardType.VAMPIRE]);

    expect(viewModel.cards.map((card) => card.type)).toEqual(SPECIAL_CARD_TYPES);
    const vampire = viewModel.cards.find((card) => card.type === CardType.VAMPIRE);
    const catalog = getCardCatalogEntry(CardType.VAMPIRE);
    expect(vampire).toMatchObject({
      name: catalog.name,
      germanName: catalog.germanName,
      rank: catalog.rank,
      rules: catalog.rules,
      enabled: true,
      pairedWith: null,
    });
    expect(viewModel.cards.filter((card) => card.enabled)).toHaveLength(1);
  });

  it('should link Dragon and Fairy rows to each other', () => {
    const { cards } = buildExpansionsViewModel([]);

    expect(cards.find((card) => card.type === CardType.DRAGON)?.pairedWith).toEqual({
      type: CardType.FAIRY,
      name: getCardCatalogEntry(CardType.FAIRY).name,
    });
    expect(cards.find((card) => card.type === CardType.FAIRY)?.pairedWith?.type).toBe(CardType.DRAGON);
  });
});

describe('expansions view model: config updates', () => {
  it('should apply a preset without touching other rule categories', () => {
    const base = { ...DEFAULT_RULESET_CONFIG, bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true } };
    const next = applyExpansionSet(base, ExpansionSetId.JUBILEE_30);

    expect(next.expansions.specialCards).toEqual(SPECIAL_CARD_TYPES);
    expect(next.bidding.hiddenBids).toBe(true);
    expect(base.expansions.specialCards).toEqual([]);
  });

  it('should reset to the classic deck', () => {
    const withCards = applyExpansionSet(DEFAULT_RULESET_CONFIG, ExpansionSetId.JUBILEE_20);

    expect(applyExpansionSet(withCards, ExpansionSetId.CLASSIC).expansions.specialCards).toEqual([]);
  });

  it('should toggle Dragon and Fairy together', () => {
    const enabled = applySpecialCardToggle(DEFAULT_RULESET_CONFIG, CardType.FAIRY, true);
    expect(enabled.expansions.specialCards).toEqual([CardType.DRAGON, CardType.FAIRY]);

    const disabled = applySpecialCardToggle(enabled, CardType.DRAGON, false);
    expect(disabled.expansions.specialCards).toEqual([]);
  });

  it('should toggle unpaired cards individually', () => {
    const full = applyExpansionSet(DEFAULT_RULESET_CONFIG, ExpansionSetId.JUBILEE_30);
    const next = applySpecialCardToggle(full, CardType.WITCH, false);

    expect(next.expansions.specialCards).toEqual(SPECIAL_CARD_TYPES.filter((type) => type !== CardType.WITCH));
  });

  it('should normalize the selection it stores', () => {
    const next = withSpecialCards(DEFAULT_RULESET_CONFIG, [CardType.BOMB, CardType.BOMB, CardType.DRAGON]);

    expect(next.expansions.specialCards).toEqual([CardType.DRAGON, CardType.FAIRY, CardType.BOMB]);
  });
});

describe('expansions view model: getExpansionSummary', () => {
  it('should return null for the classic deck', () => {
    expect(getExpansionSummary([])).toBeNull();
  });

  it('should name the matching edition', () => {
    const summary = getExpansionSummary(SPECIAL_CARD_TYPES);
    const setName = getExpansionSet(ExpansionSetId.JUBILEE_30).name;

    expect(summary?.setName).toBe(setName);
    expect(summary?.label).toBe(`${setName} ${EXPANSIONS_UI_CONFIG.DECK_LABEL_SUFFIX}`);
    expect(summary?.cardNames).toHaveLength(SPECIAL_CARD_TYPES.length);
  });

  it('should label a custom mix and list its cards in canonical order', () => {
    const summary = getExpansionSummary([CardType.WITCH, CardType.BOMB]);

    expect(summary?.setName).toBeNull();
    expect(summary?.label).toBe(`${EXPANSIONS_UI_CONFIG.CUSTOM_SET_LABEL} ${EXPANSIONS_UI_CONFIG.DECK_LABEL_SUFFIX}`);
    expect(summary?.cardNames).toEqual([
      getCardCatalogEntry(CardType.BOMB).name,
      getCardCatalogEntry(CardType.WITCH).name,
    ]);
  });
});
