import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ITrick, ICard, GamePhase } from '@shared/domain';
import type { FrozenCollectingCards } from '../types';
import {
  buildCollectingAnimationKey,
  createCollectingCompletionLifecycle,
  isCollectingCompletionPending,
  markCollectingCardComplete,
  resetCollectingCompletion,
  startCollectingCompletion,
} from './collecting-animation-lifecycle';

interface UseCollectingAnimationProps {
  trickWinnerId?: string | null;
  currentTrick: ITrick | null;
  gamePhase?: GamePhase;
  onTrickCollectComplete?: () => void;
}

interface UseCollectingAnimationReturn {
  playerDecks: Map<string, ICard[]>;
  frozenCollectingCards: FrozenCollectingCards | null;
  handleCollectingCardComplete: (cardId: string) => void;
}

export function useCollectingAnimation({
  trickWinnerId,
  currentTrick,
  gamePhase,
  onTrickCollectComplete,
}: UseCollectingAnimationProps): UseCollectingAnimationReturn {
  const completionLifecycleRef = useRef(createCollectingCompletionLifecycle());
  const lastCollectionKeyRef = useRef<string | null>(null);

  // Persists collected cards after animation completes
  const [playerDecks, setPlayerDecks] = useState<Map<string, ICard[]>>(new Map());
  const pendingDeckCardsRef = useRef<{ winnerId: string; cards: ICard[] } | null>(null);

  // Frozen snapshot prevents unmount when currentTrick changes during collection
  const [frozenCollectingCards, setFrozenCollectingCards] = useState<FrozenCollectingCards | null>(null);

  // Reset state on phase change - intentional derived state reset
  useEffect(() => {
    if (gamePhase === GamePhase.LOBBY || gamePhase === GamePhase.BIDDING || gamePhase === GamePhase.TRUMP_SELECTION) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlayerDecks(new Map());
      setFrozenCollectingCards(null);
      pendingDeckCardsRef.current = null;
      lastCollectionKeyRef.current = null;
      resetCollectingCompletion(completionLifecycleRef.current);
    }
  }, [gamePhase]);

  // GUARD: Don't reset if animation already in progress (prevents race condition).
  // Layout effect: collecting cards must mount in the same commit that hides the played cards
  // (PlayerAreaRenderer's !trickWinnerId), otherwise a frame can draw an empty table between them.
  useLayoutEffect(() => {
    const collectionKey = buildCollectingAnimationKey(trickWinnerId, currentTrick?.cards);

    if (trickWinnerId && currentTrick?.cards && collectionKey) {
      const isNewTrick = collectionKey !== lastCollectionKeyRef.current;
      const animationInProgress = isCollectingCompletionPending(completionLifecycleRef.current);

      if (isNewTrick && !animationInProgress) {
        const cardIds = currentTrick.cards.map((played) => played.card.id);
        lastCollectionKeyRef.current = collectionKey;
        startCollectingCompletion(completionLifecycleRef.current, collectionKey, cardIds);

        setFrozenCollectingCards({
          winnerId: trickWinnerId,
          cards: [...currentTrick.cards],
        });

        pendingDeckCardsRef.current = {
          winnerId: trickWinnerId,
          cards: currentTrick.cards.map(pc => pc.card),
        };

        if (cardIds.length === 0) {
          onTrickCollectComplete?.();
        }
      }
    } else if (!trickWinnerId) {
      // Only clear if no animation is in progress
      if (!isCollectingCompletionPending(completionLifecycleRef.current)) {
        lastCollectionKeyRef.current = null;
        setFrozenCollectingCards(null);
      }
    }
  }, [trickWinnerId, currentTrick?.cards, onTrickCollectComplete]);

  const handleCollectingCardComplete = useCallback((cardId: string) => {
    if (markCollectingCardComplete(completionLifecycleRef.current, cardId)) {
      // Dedupe to prevent duplicates from rapid re-renders
      if (pendingDeckCardsRef.current) {
        const { winnerId, cards } = pendingDeckCardsRef.current;
        setPlayerDecks(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(winnerId) ?? [];
          const existingIds = new Set(existing.map(c => c.id));
          const newCards = cards.filter(c => !existingIds.has(c.id));
          if (newCards.length > 0) {
            newMap.set(winnerId, [...existing, ...newCards]);
          }
          return newMap;
        });
        pendingDeckCardsRef.current = null;
      }

      setFrozenCollectingCards(null);

      onTrickCollectComplete?.();
    }
  }, [onTrickCollectComplete]);

  return {
    playerDecks,
    frozenCollectingCards,
    handleCollectingCardComplete,
  };
}
