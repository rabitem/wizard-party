import { useRef, useCallback, useLayoutEffect } from 'react';
import { ITrick, ICard } from '@shared/domain';
import {
  createCardLandingLifecycle,
  markCardLanded,
  markCardsAlreadyLanded,
  syncExpectedCards,
} from './card-landing-lifecycle';

interface UseCardLandingTrackingProps {
  currentTrick: ITrick | null;
  isWaitingForCardsToLand?: boolean;
  onCardLand?: (card: ICard) => void;
  onAllCardsLanded?: () => void;
}

interface UseCardLandingTrackingReturn {
  handlePlayedCardImpact: (cardId: string) => void;
  handlePlayedCardRest: (cardId: string) => void;
  markPlayedCardAlreadyRested: (cardId: string) => void;
}

export function useCardLandingTracking({
  currentTrick,
  isWaitingForCardsToLand,
  onCardLand,
  onAllCardsLanded,
}: UseCardLandingTrackingProps): UseCardLandingTrackingReturn {
  const lifecycleRef = useRef(createCardLandingLifecycle());
  const impactedCardsRef = useRef<Set<string>>(new Set());

  // Reset landed cards tracking when trick cards change. Layout effect: the expected set must
  // change in the same commit that hands useFrame the new callbacks, or a card resting in the
  // next frame pairs the new waiting flag with the old trick's cards and reports all landed early.
  useLayoutEffect(() => {
    const cardIds = currentTrick?.cards.map((pc) => pc.card.id) ?? [];
    const currentCardIds = new Set(cardIds);

    impactedCardsRef.current = new Set(
      [...impactedCardsRef.current].filter((cardId) => currentCardIds.has(cardId))
    );

    if (syncExpectedCards(lifecycleRef.current, cardIds, !!isWaitingForCardsToLand)) {
      onAllCardsLanded?.();
    }
  }, [currentTrick?.cards, isWaitingForCardsToLand, onAllCardsLanded]);

  const handlePlayedCardImpact = useCallback((cardId: string) => {
    if (impactedCardsRef.current.has(cardId)) return;
    impactedCardsRef.current.add(cardId);

    const playedCard = currentTrick?.cards.find(pc => pc.card.id === cardId);
    if (playedCard) {
      onCardLand?.(playedCard.card);
    }
  }, [onCardLand, currentTrick?.cards]);

  const handlePlayedCardRest = useCallback((cardId: string) => {
    if (markCardLanded(lifecycleRef.current, cardId, !!isWaitingForCardsToLand)) {
      onAllCardsLanded?.();
    }
  }, [isWaitingForCardsToLand, onAllCardsLanded]);

  const markPlayedCardAlreadyRested = useCallback((cardId: string) => {
    if (markCardsAlreadyLanded(lifecycleRef.current, [cardId], !!isWaitingForCardsToLand)) {
      onAllCardsLanded?.();
    }
  }, [isWaitingForCardsToLand, onAllCardsLanded]);

  return { handlePlayedCardImpact, handlePlayedCardRest, markPlayedCardAlreadyRested };
}
