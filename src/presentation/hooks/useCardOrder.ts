'use client';

import { useState, useCallback, useRef } from 'react';
import { ICard, CardSortService } from '@shared/domain';

export type HandAnimation = 'none' | 'shuffle' | 'sort';

export interface UseCardOrderReturn {
  cardOrder: string[];
  handAnimation: HandAnimation;
  shuffleCards: (hand: ICard[], playSound: () => void) => void;
  sortCards: (hand: ICard[], playSound: () => void) => void;
  handleHandAnimationProgress: (progress: number) => void;
  getOrderedCards: (cards: ICard[]) => ICard[];
}

type ActiveHandAnimation = {
  type: Exclude<HandAnimation, 'none'>;
  hand: ICard[];
  reordered: boolean;
};

function shuffleHandIds(hand: ICard[]): string[] {
  const ids = hand.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export function useCardOrder(): UseCardOrderReturn {
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [handAnimation, setHandAnimation] = useState<HandAnimation>('none');
  const activeAnimationRef = useRef<ActiveHandAnimation | null>(null);

  const applyAnimationOrder = useCallback((activeAnimation: ActiveHandAnimation) => {
    if (activeAnimation.reordered) return;

    if (activeAnimation.type === 'shuffle') {
      setCardOrder(shuffleHandIds(activeAnimation.hand));
    } else {
      const sorted = CardSortService.sortHand(activeAnimation.hand);
      setCardOrder(sorted.map((c) => c.id));
    }

    activeAnimation.reordered = true;
  }, []);

  const startHandAnimation = useCallback((
    type: Exclude<HandAnimation, 'none'>,
    hand: ICard[],
    playSound: () => void,
  ) => {
    if (!hand || hand.length === 0 || activeAnimationRef.current !== null) return;

    playSound();
    activeAnimationRef.current = { type, hand, reordered: false };
    setHandAnimation(type);
  }, []);

  const shuffleCards = useCallback((hand: ICard[], playSound: () => void) => {
    startHandAnimation('shuffle', hand, playSound);
  }, [startHandAnimation]);

  const sortCards = useCallback((hand: ICard[], playSound: () => void) => {
    startHandAnimation('sort', hand, playSound);
  }, [startHandAnimation]);

  const handleHandAnimationProgress = useCallback((progress: number) => {
    const activeAnimation = activeAnimationRef.current;
    if (!activeAnimation) return;

    const reorderProgress = activeAnimation.type === 'shuffle' ? 0.4 : 0.2;
    if (progress >= reorderProgress) {
      applyAnimationOrder(activeAnimation);
    }

    if (progress >= 1) {
      if (!activeAnimation.reordered) applyAnimationOrder(activeAnimation);
      activeAnimationRef.current = null;
      setHandAnimation('none');
    }
  }, [applyAnimationOrder]);

  const getOrderedCards = useCallback((cards: ICard[]): ICard[] => {
    if (cardOrder.length === 0) return cards;

    const cardMap = new Map(cards.map((c) => [c.id, c]));
    const ordered: ICard[] = [];

    for (const id of cardOrder) {
      const card = cardMap.get(id);
      if (card) {
        ordered.push(card);
        cardMap.delete(id);
      }
    }

    // Append cards not in saved order (new cards dealt mid-round)
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
    handleHandAnimationProgress,
    getOrderedCards,
  };
}
