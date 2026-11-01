import { describe, expect, it } from 'vitest';

import {
  CardForm,
  CardType,
  FREE_LEAD,
  PENDING_LEAD,
  Suit,
  TrickLeadKind,
  getTrickLead,
  leadSuitOf,
  legalPlays,
  suitLead,
  type ICard,
  type ICardDeclaration,
} from '../index';
import { Trick } from '../entities/trick';

const n = (suit: Suit, value: number): ICard => ({ id: `${suit}-${value}`, type: CardType.NUMBER, suit, value });
const special = (type: CardType, index = 0): ICard => ({ id: `${type}-${index}`, type, suit: null, value: null });
const WIZARD = special(CardType.WIZARD);
const WIZARD_2 = special(CardType.WIZARD, 1);
const JESTER = special(CardType.JESTER);
const JESTER_2 = special(CardType.JESTER, 1);

function leadOf(cards: (ICard | [ICard, ICardDeclaration])[]) {
  return getTrickLead(cards.map((entry) => {
    const [card, declaration] = Array.isArray(entry) ? entry : [entry, undefined];
    return { card, declaration };
  }));
}

const ids = (cards: readonly ICard[]) => cards.map((card) => card.id);

describe('trick lead', () => {
  it('is pending for an empty trick and while only Jesters were played', () => {
    expect(leadOf([])).toEqual(PENDING_LEAD);
    expect(leadOf([JESTER])).toEqual(PENDING_LEAD);
    expect(leadOf([JESTER, JESTER_2])).toEqual(PENDING_LEAD);
  });

  it('is set by the first number card after leading Jesters', () => {
    expect(leadOf([JESTER, n(Suit.ELVES, 5), n(Suit.GIANTS, 9)])).toEqual(suitLead(Suit.ELVES));
  });

  it('is free once a Wizard is led: later number cards never set a suit', () => {
    expect(leadOf([WIZARD])).toEqual(FREE_LEAD);
    expect(leadOf([WIZARD, n(Suit.ELVES, 5)])).toEqual(FREE_LEAD);
    expect(leadOf([WIZARD, n(Suit.ELVES, 5), WIZARD_2, n(Suit.GIANTS, 9)])).toEqual(FREE_LEAD);
  });

  it('is free when a Wizard follows leading Jesters', () => {
    expect(leadOf([JESTER, WIZARD, n(Suit.GIANTS, 9)])).toEqual(FREE_LEAD);
  });

  it('stays the suit of the first number card even if a Wizard comes later', () => {
    expect(leadOf([n(Suit.DWARVES, 2), WIZARD, n(Suit.HUMANS, 13)])).toEqual(suitLead(Suit.DWARVES));
  });

  it('treats the Dragon like a Wizard and powerless specials like Jesters', () => {
    expect(leadOf([special(CardType.DRAGON), n(Suit.ELVES, 5)])).toEqual(FREE_LEAD);
    expect(leadOf([special(CardType.FAIRY), special(CardType.BOMB), n(Suit.ELVES, 5)])).toEqual(suitLead(Suit.ELVES));
  });

  it('follows the declaration of suit-announcing and shape-shifting cards', () => {
    expect(leadOf([[special(CardType.CLOUD), { suit: Suit.HUMANS }]])).toEqual(suitLead(Suit.HUMANS));
    expect(leadOf([[special(CardType.SHAPESHIFTER), { form: CardForm.WIZARD }], n(Suit.ELVES, 3)])).toEqual(FREE_LEAD);
    expect(leadOf([[special(CardType.SHAPESHIFTER), { form: CardForm.JESTER }], n(Suit.ELVES, 3)]))
      .toEqual(suitLead(Suit.ELVES));
  });

  it('collapses to the wire lead suit: null for pending and free', () => {
    expect(leadSuitOf(PENDING_LEAD)).toBeNull();
    expect(leadSuitOf(FREE_LEAD)).toBeNull();
    expect(leadSuitOf(suitLead(Suit.GIANTS))).toBe(Suit.GIANTS);
    expect(suitLead(Suit.GIANTS).kind).toBe(TrickLeadKind.SUIT);
  });
});

describe('legal plays', () => {
  const hand = [n(Suit.ELVES, 2), n(Suit.DWARVES, 13), WIZARD_2, JESTER_2];

  it('allows every card when the lead is pending or free', () => {
    expect(ids(legalPlays(hand, PENDING_LEAD))).toEqual(ids(hand));
    expect(ids(legalPlays(hand, FREE_LEAD))).toEqual(ids(hand));
  });

  it('requires the lead suit (plus Wizards and Jesters) when the player can follow', () => {
    expect(ids(legalPlays(hand, suitLead(Suit.ELVES)))).toEqual(['ELVES-2', 'WIZARD-1', 'JESTER-1']);
  });

  it('allows every card when the player cannot follow the lead suit', () => {
    expect(ids(legalPlays(hand, suitLead(Suit.HUMANS)))).toEqual(ids(hand));
  });

  it('lets a player discard after a led Wizard (regression: the Wizard did not free the trick)', () => {
    const trick = new Trick(Suit.GIANTS);
    trick.playCard('p1', WIZARD);
    trick.playCard('p2', n(Suit.ELVES, 5));

    expect(trick.getLead()).toEqual(FREE_LEAD);
    expect(trick.leadSuit).toBeNull();
    expect(ids(legalPlays([n(Suit.ELVES, 2), n(Suit.DWARVES, 13)], trick.getLead()))).toEqual(['ELVES-2', 'DWARVES-13']);
  });

  it('re-derives the lead of a stored trick instead of trusting a stale lead suit', () => {
    const restored = Trick.fromJSON({
      cards: [{ playerId: 'p1', card: WIZARD }, { playerId: 'p2', card: n(Suit.ELVES, 5) }],
      leadSuit: Suit.ELVES,
      winnerId: null,
    }, null);

    expect(restored.getLead()).toEqual(FREE_LEAD);
    expect(restored.toJSON().leadSuit).toBeNull();
  });
});
