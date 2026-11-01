import { describe, expect, it } from 'vitest';

import type { Card } from '../entities/card';
import { Suit } from '../value-objects/card-types';
import { createInformationSet, type InformationSet } from './information-set';
import { jester, n, wizard, withSeededMath } from './bot-ai.fixtures';

const OPPONENTS = ['p1', 'p2'];

function roundFor(
  hand: Card[],
  trumpCard: Card | null = null,
  roundNumber = hand.length,
  opponents: string[] = OPPONENTS
): InformationSet {
  const set = createInformationSet();
  set.initializeRound({
    hand,
    trumpSuit: trumpCard?.suit ?? null,
    trumpCard,
    playerIds: [...opponents, 'me'],
    ourPlayerId: 'me',
    roundNumber,
  });
  return set;
}

const countBy = (cards: Card[], predicate: (card: Card) => boolean) => cards.filter(predicate).length;

describe('InformationSet: what the seat knows', () => {
  it('counts every card it has not seen as unseen: own hand, trump card and played cards excluded', () => {
    const hand = [n(Suit.ELVES, 13), wizard(2), jester(0)];
    const trumpCard = n(Suit.GIANTS, 4);
    const set = roundFor(hand, trumpCard);
    set.recordCardPlayed('p1', n(Suit.HUMANS, 7), null, true);
    set.recordCardPlayed('p2', wizard(0), Suit.HUMANS, false);

    const unseen = set.getUnseenCards();
    const ids = unseen.map((card) => card.id);

    // 60 cards minus 3 in hand, the trump card and 2 played.
    expect(unseen).toHaveLength(54);
    for (const known of [n(Suit.ELVES, 13), trumpCard, n(Suit.HUMANS, 7)]) expect(ids).not.toContain(known.id);
    expect(countBy(unseen, (card) => card.isWizard())).toBe(2);
    expect(countBy(unseen, (card) => card.isJester())).toBe(3);
  });

  it.each([
    { name: 'a number card off the suit led', card: n(Suit.GIANTS, 2), leading: false, voids: [Suit.ELVES] },
    { name: 'a number card of the suit led', card: n(Suit.ELVES, 2), leading: false, voids: [] },
    { name: 'a Wizard', card: wizard(0), leading: false, voids: [] },
    { name: 'a Jester', card: jester(0), leading: false, voids: [] },
    { name: 'the lead card itself', card: n(Suit.GIANTS, 2), leading: true, voids: [] },
  ])('marks a player void in the led suit only after $name', ({ card, leading, voids }) => {
    const set = roundFor([n(Suit.HUMANS, 1), n(Suit.HUMANS, 2)]);

    set.recordCardPlayed('p1', card, Suit.ELVES, leading);

    expect([...set.getVoidSuits('p1')]).toEqual(voids);
    expect([...set.getVoidSuits('p2')]).toEqual([]);
  });
});

describe('InformationSet: determinizations', () => {
  function assertConsistent(
    hands: Map<string, Card[]>,
    set: InformationSet,
    known: Card[],
    size: number,
    opponents: string[] = OPPONENTS
  ): void {
    expect([...hands.keys()].sort()).toEqual(opponents);
    const dealt = [...hands.values()].flat();
    // Number cards have one copy, so their ids must be unique and never ones the seat has seen.
    const numberIds = dealt.filter((card) => card.isNumberCard()).map((card) => card.id);
    expect(new Set(numberIds).size).toBe(numberIds.length);
    for (const card of known) expect(numberIds).not.toContain(card.id);
    // Never more Wizards or Jesters than the deck holds besides the ones already seen.
    const seenWizards = countBy(known, (card) => card.isWizard());
    const seenJesters = countBy(known, (card) => card.isJester());
    expect(countBy(dealt, (card) => card.isWizard())).toBeLessThanOrEqual(4 - seenWizards);
    expect(countBy(dealt, (card) => card.isJester())).toBeLessThanOrEqual(4 - seenJesters);
    for (const [playerId, hand] of hands) {
      expect(hand).toHaveLength(size);
      for (const suit of set.getVoidSuits(playerId)) {
        expect(hand.filter((card) => card.suit === suit)).toEqual([]);
      }
    }
  }

  it('deals each opponent a full hand of unseen cards that respects every known void', () => {
    const hand = [n(Suit.ELVES, 13), n(Suit.ELVES, 12), wizard(1), jester(3)];
    const trumpCard = n(Suit.GIANTS, 4);
    const played = [n(Suit.HUMANS, 9), n(Suit.DWARVES, 2)];
    const set = roundFor(hand, trumpCard, 5);
    set.recordCardPlayed('p1', played[0], null, true);
    set.recordCardPlayed('p2', played[1], Suit.HUMANS, false);
    expect([...set.getVoidSuits('p2')]).toEqual([Suit.HUMANS]);

    for (let seed = 1; seed <= 25; seed++) {
      const hands = withSeededMath(seed, () => set.sampleDeterminization(4));
      assertConsistent(hands, set, [...hand, trumpCard, ...played], 4);
    }
  });

  it('still respects voids when cards are so scarce that random dealing keeps failing', () => {
    // p3 showed out of three suits and we hold nine Humans: only H10 and the eight Wizards
    // and Jesters fit p3's nine cards. Shuffles that hand any of them to p1 or p2 first are
    // rejected, so most deals fall back to placing the constrained cards one by one.
    const opponents = ['p1', 'p2', 'p3'];
    const hand = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => n(Suit.HUMANS, value));
    const set = roundFor(hand, null, 12, opponents);
    const shownOut = [n(Suit.HUMANS, 11), n(Suit.HUMANS, 12), n(Suit.HUMANS, 13)];
    [Suit.GIANTS, Suit.ELVES, Suit.DWARVES].forEach((suit, index) => {
      set.recordCardPlayed('p3', shownOut[index], suit, false);
    });

    for (let seed = 1; seed <= 25; seed++) {
      const hands = withSeededMath(seed, () => set.sampleDeterminization(9));
      assertConsistent(hands, set, [...hand, ...shownOut], 9, opponents);
      const p3Numbers = hands.get('p3')?.filter((card) => card.isNumberCard()) ?? [];
      expect(p3Numbers.map((card) => card.id)).toEqual([n(Suit.HUMANS, 10).id]);
    }
  });

  it('deals the same opponent hands from the same seed', () => {
    const set = roundFor([n(Suit.ELVES, 1), n(Suit.ELVES, 2), n(Suit.ELVES, 3)]);
    const deal = () => withSeededMath(9, () => set.sampleDeterminization(3));
    expect(deal()).toEqual(deal());
  });
});

describe('InformationSet: opponent state', () => {
  // Beliefs are rebuilt for every decision, so the hand holds one card per trick still to play.
  function midRound(): InformationSet {
    const set = roundFor([n(Suit.ELVES, 1), n(Suit.ELVES, 2)], n(Suit.GIANTS, 2), 3);
    set.recordBid('p1', 1);
    set.recordBid('p2', 3);
    return set;
  }

  const opponent = (set: InformationSet, playerId: string) =>
    set.getAllOpponents().find((candidate) => candidate.playerId === playerId);

  it('marks an opponent satisfied once its tricks reach its bid', () => {
    const set = midRound();
    expect(opponent(set, 'p1')).toMatchObject({ tricksNeeded: 1, isSatisfied: false });

    set.recordTrickWon('p1');

    expect(opponent(set, 'p1')).toMatchObject({ tricksWon: 1, tricksNeeded: 0, isSatisfied: true });
  });

  it('marks an opponent desperate when it needs every trick still to play', () => {
    const set = midRound();

    set.recordTrickWon('p2');

    // p2 bid 3, took 1 and needs both remaining tricks; p1 still needs 1 of 2.
    expect(opponent(set, 'p2')).toMatchObject({ tricksNeeded: 2, isDesparate: true });
    set.recordTrickWon('p1');
    expect(opponent(set, 'p1')).toMatchObject({ isDesparate: false });
  });

  it('only tracks the other seats', () => {
    const set = roundFor([n(Suit.ELVES, 1)]);

    set.recordBid('me', 1);
    set.recordCardPlayed('me', n(Suit.GIANTS, 3), Suit.ELVES, false);
    set.recordTrickWon('stranger');

    expect(set.getAllOpponents().map((candidate) => candidate.playerId)).toEqual(OPPONENTS);
    expect(set.getAllOpponents().every((candidate) => candidate.bid === null && candidate.tricksWon === 0)).toBe(true);
    // Our own card is seen (no longer unseen) but proves nothing about an opponent.
    expect(set.getUnseenCards().map((card) => card.id)).not.toContain(n(Suit.GIANTS, 3).id);
    for (const id of OPPONENTS) expect(set.getVoidSuits(id).size).toBe(0);
  });
});
