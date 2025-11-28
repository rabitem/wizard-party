'use client';

import { useState, useCallback } from 'react';
import { CardType, Suit, ICard } from '@shared/domain';

export type HandAnimation = 'none' | 'shuffle' | 'sort';

export interface UseCardOrderReturn {
  cardOrder: string[];
  handAnimation: HandAnimation;
  shuffleCards: (hand: ICard[], playSound: () => void) => void;
  sortCards: (hand: ICard[], playSound: () => void) => void;
  getOrderedCards: (cards: ICard[]) => ICard[];
}

export function useCardOrder(): UseCardOrderReturn {
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [handAnimation, setHandAnimation] = useState<HandAnimation>('none');

  // Shuffle cards (Fisher-Yates) with animation
  const shuffleCards = useCallback((hand: ICard[], playSound: () => void) => {
    if (!hand || hand.length === 0 || handAnimation !== 'none') return;

    // Play shuffle sound
    playSound();

    // Trigger animation
    setHandAnimation('shuffle');

    // Delay the actual shuffle to let animation start
    setTimeout(() => {
      const ids = hand.map((c) => c.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setCardOrder(ids);

      // End animation after cards settle
      setTimeout(() => setHandAnimation('none'), 400);
    }, 150);
  }, [handAnimation]);

  // Sort cards by type: Wizards first, then by suit + value, Jesters last
  const sortCards = useCallback((hand: ICard[], playSound: () => void) => {
    if (!hand || hand.length === 0 || handAnimation !== 'none') return;

    // Play sort sound
    playSound();

    // Trigger animation
    setHandAnimation('sort');

    const suitOrder = [Suit.GIANTS, Suit.ELVES, Suit.DWARVES, Suit.HUMANS];

    // Delay the actual sort to let animation start
    setTimeout(() => {
      const sorted = [...hand].sort((a, b) => {
        // Wizards first
        if (a.type === CardType.WIZARD && b.type !== CardType.WIZARD) return -1;
        if (b.type === CardType.WIZARD && a.type !== CardType.WIZARD) return 1;

        // Jesters last
        if (a.type === CardType.JESTER && b.type !== CardType.JESTER) return 1;
        if (b.type === CardType.JESTER && a.type !== CardType.JESTER) return -1;

        // Both same special type
        if (a.type === CardType.WIZARD || a.type === CardType.JESTER) return 0;

        // Sort by suit then value
        const suitDiff = suitOrder.indexOf(a.suit!) - suitOrder.indexOf(b.suit!);
        if (suitDiff !== 0) return suitDiff;
        return (a.value ?? 0) - (b.value ?? 0);
      });

      setCardOrder(sorted.map((c) => c.id));

      // End animation after cards settle
      setTimeout(() => setHandAnimation('none'), 400);
    }, 100);
  }, [handAnimation]);

  // Get ordered cards based on cardOrder state
  const getOrderedCards = useCallback((cards: ICard[]): ICard[] => {
    if (cardOrder.length === 0) return cards;

    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const ordered: ICard[] = [];

    // Add cards in order (only those still in hand)
    for (const id of cardOrder) {
      const card = cardMap.get(id);
      if (card) {
        ordered.push(card);
        cardMap.delete(id);
      }
    }

    // Add any new cards not in the saved order (shouldn't happen normally)
    for (const card of cardMap.values()) {
      ordered.push(card);
    }

    return ordered;
  }, [cardOrder]);

  return {
    cardOrder,
    handAnimation,
    shuffleCards,
    sortCards,
    getOrderedCards,
  };
}
