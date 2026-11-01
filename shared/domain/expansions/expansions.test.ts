import { describe, expect, it } from 'vitest';

import {
  CardForm,
  CardType,
  CLASSIC_DECK_SIZE,
  EXPANSION_SETS,
  ExpansionSetId,
  SPECIAL_CARD_TYPES,
  Suit,
  TrickEffectKind,
  TrumpChoiceReason,
  buildDeckCards,
  deriveTrickEffects,
  findMatchingExpansionSet,
  getRoundCount,
  legalPlays,
  normalizeSpecialCards,
  resolveCardBehavior,
  resolveTrick,
  revealTrump,
  suitLead,
  toggleSpecialCard,
  type ICard,
  type ICardDeclaration,
  type ICardRoundContext,
} from '../index';

const n = (suit: Suit, value: number): ICard => ({ id: `${suit}-${value}`, type: CardType.NUMBER, suit, value });
const special = (type: CardType, index = 0): ICard => ({ id: `${type}-${index}`, type, suit: null, value: null });
const WIZARD = special(CardType.WIZARD);
const JESTER = special(CardType.JESTER);

function plays(
  cards: (ICard | [ICard, ICardDeclaration])[],
  context?: ICardRoundContext
) {
  return cards.map((entry, index) => {
    const [card, declaration] = Array.isArray(entry) ? entry : [entry, undefined];
    return { playerId: `p${index + 1}`, behavior: resolveCardBehavior(card, declaration, context) };
  });
}

describe('expansion rules', () => {
  describe('deck composition', () => {
    it('builds the classic 60-card deck without expansions', () => {
      expect(buildDeckCards()).toHaveLength(CLASSIC_DECK_SIZE);
      expect(CLASSIC_DECK_SIZE).toBe(60);
    });

    it('adds one copy per enabled special card with unique ids', () => {
      const deck = buildDeckCards(SPECIAL_CARD_TYPES);
      expect(deck).toHaveLength(60 + SPECIAL_CARD_TYPES.length);
      expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
    });

    it('never adds rounds for special cards', () => {
      expect(getRoundCount(3)).toBe(20);
    });
  });

  describe('selection', () => {
    it('keeps Dragon and Fairy paired and orders canonically', () => {
      expect(normalizeSpecialCards([CardType.FAIRY, 'NOPE', CardType.BOMB])).toEqual([
        CardType.DRAGON,
        CardType.FAIRY,
        CardType.BOMB,
      ]);
      expect(toggleSpecialCard([CardType.DRAGON, CardType.FAIRY], CardType.DRAGON, false)).toEqual([]);
    });

    it('recognises the official sets', () => {
      const jubilee30 = EXPANSION_SETS.find((set) => set.id === ExpansionSetId.JUBILEE_30);
      expect(jubilee30?.cards).toHaveLength(9);
      expect(findMatchingExpansionSet([...SPECIAL_CARD_TYPES].reverse())?.id).toBe(ExpansionSetId.JUBILEE_30);
      expect(findMatchingExpansionSet([CardType.BOMB])).toBeNull();
    });
  });

  describe('trick resolution', () => {
    it('lets the Dragon beat Wizards', () => {
      const result = resolveTrick(plays([WIZARD, special(CardType.DRAGON), n(Suit.ELVES, 13)]), null);
      expect(result.winnerId).toBe('p2');
    });

    it('lets the Fairy win a trick that holds the Dragon', () => {
      const result = resolveTrick(plays([special(CardType.DRAGON), WIZARD, special(CardType.FAIRY)]), null);
      expect(result.winnerId).toBe('p3');
    });

    it('ranks the Fairy below the Jester and the Witch below both', () => {
      const trick = plays([special(CardType.WITCH), special(CardType.FAIRY), JESTER]);
      expect(resolveTrick(trick, null).winnerId).toBe('p3');
      expect(resolveTrick(plays([special(CardType.WITCH), special(CardType.FAIRY)]), null).winnerId).toBe('p2');
    });

    it('voids a Bomb trick and lets the would-be winner lead', () => {
      const result = resolveTrick(plays([n(Suit.ELVES, 3), special(CardType.BOMB), n(Suit.ELVES, 9)]), null);
      expect(result).toMatchObject({ voided: true, winnerId: null, leaderId: 'p3' });
    });

    it('treats a Cloud as 9 3/4 of its announced suit', () => {
      const cloud: [ICard, ICardDeclaration] = [special(CardType.CLOUD), { suit: Suit.ELVES }];
      expect(resolveTrick(plays([n(Suit.ELVES, 9), cloud, n(Suit.ELVES, 10)]), null).winnerId).toBe('p3');
      expect(resolveTrick(plays([n(Suit.ELVES, 9), cloud]), null).winnerId).toBe('p2');
    });

    it('lets an announced trump Juggler beat the lead suit', () => {
      const juggler: [ICard, ICardDeclaration] = [special(CardType.JUGGLER), { suit: Suit.HUMANS }];
      const result = resolveTrick(plays([n(Suit.ELVES, 13), juggler]), Suit.HUMANS);
      expect(result.winnerId).toBe('p2');
    });

    it('plays the Shapeshifter in its announced form', () => {
      const asJester: [ICard, ICardDeclaration] = [special(CardType.SHAPESHIFTER), { form: CardForm.JESTER }];
      const asWizard: [ICard, ICardDeclaration] = [special(CardType.SHAPESHIFTER), { form: CardForm.WIZARD }];
      expect(resolveTrick(plays([asJester, n(Suit.ELVES, 1)]), null).winnerId).toBe('p2');
      expect(resolveTrick(plays([n(Suit.ELVES, 13), asWizard]), null).winnerId).toBe('p2');
    });

    it('lets the Vampire copy the turned-up trump card', () => {
      const context = { copySource: n(Suit.DWARVES, 12) };
      const result = resolveTrick(plays([n(Suit.DWARVES, 11), special(CardType.VAMPIRE)], context), Suit.DWARVES);
      expect(result.winnerId).toBe('p2');
      expect(resolveCardBehavior(special(CardType.VAMPIRE), undefined, { copySource: WIZARD }).actsAs)
        .toBe(CardType.WIZARD);
    });
  });

  describe('follow suit', () => {
    it('always allows special cards but never counts them as holding the suit', () => {
      const hand = [n(Suit.ELVES, 2), n(Suit.GIANTS, 5), special(CardType.CLOUD), special(CardType.VAMPIRE)];
      expect(legalPlays(hand, suitLead(Suit.ELVES)).map((card) => card.id)).toEqual([
        'ELVES-2',
        'CLOUD-0',
        'VAMPIRE-0',
      ]);
      const onlySpecials = [n(Suit.GIANTS, 5), special(CardType.CLOUD)];
      expect(legalPlays(onlySpecials, suitLead(Suit.ELVES))).toHaveLength(2);
    });
  });

  describe('trump reveal', () => {
    const draws = (...cards: ICard[]) => () => cards.shift() ?? null;

    it('sets a turned-up Werewolf aside and turns up the next card', () => {
      const result = revealTrump({ draw: draws(special(CardType.WEREWOLF), n(Suit.ELVES, 4)), dealerId: 'd', hands: [] });
      expect(result.trumpSuit).toBe(Suit.ELVES);
      expect(result.setAside.map((card) => card.type)).toEqual([CardType.WEREWOLF]);
    });

    it('hands the trump choice (with no-trump) to the Werewolf holder', () => {
      const result = revealTrump({
        draw: draws(n(Suit.ELVES, 4)),
        dealerId: 'd',
        hands: [{ playerId: 'd', hand: [] }, { playerId: 'w', hand: [special(CardType.WEREWOLF)] }],
      });
      expect(result.trumpChoice).toEqual({ playerId: 'w', allowNoTrump: true, reason: TrumpChoiceReason.WEREWOLF });
      expect(result.trumpCard?.type).toBe(CardType.WEREWOLF);
      expect(result.copySource?.id).toBe('ELVES-4');
    });

    it.each([
      [CardType.DRAGON, true],
      [CardType.CLOUD, true],
      [CardType.SHAPESHIFTER, true],
      [CardType.FAIRY, false],
      [CardType.BOMB, false],
      [CardType.WITCH, false],
    ])('handles a turned-up %s (dealer chooses: %s)', (type, dealerChooses) => {
      const result = revealTrump({ draw: draws(special(type)), dealerId: 'd', hands: [] });
      expect(result.trumpSuit).toBeNull();
      expect(result.trumpChoice?.playerId ?? null).toBe(dealerChooses ? 'd' : null);
    });
  });

  describe('trick effects', () => {
    const seats = ['p1', 'p2', 'p3'];

    it('queues Juggler, Cloud and Witch in the official order', () => {
      const trick = plays([
        special(CardType.WITCH),
        [special(CardType.CLOUD), { suit: Suit.ELVES }],
        [special(CardType.JUGGLER), { suit: Suit.ELVES }],
      ]);
      const effects = deriveTrickEffects(trick, resolveTrick(trick, null), seats, false);
      expect(effects.map((effect) => effect.kind)).toEqual([
        TrickEffectKind.PASS_LEFT,
        TrickEffectKind.ADJUST_BID,
        TrickEffectKind.SWAP_WITH_TRICK,
      ]);
    });

    it('skips the Cloud in a Bomb trick and hand effects after the last trick', () => {
      const trick = plays([special(CardType.BOMB), [special(CardType.CLOUD), { suit: Suit.ELVES }], special(CardType.WITCH)]);
      expect(deriveTrickEffects(trick, resolveTrick(trick, null), seats, true)).toEqual([]);
    });
  });
});
