import { useCallback } from 'react';
import { IGameState, ICard } from '@shared/domain';

/**
 * Hook to calculate playable cards based on game rules
 */
export function usePlayableCards(
  gameState: IGameState | null,
  playerId: string | null
) {
  const getPlayableCards = useCallback((): ICard[] => {
    if (!gameState || !playerId) return [];

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return [];

    const leadSuit = gameState.currentTrick?.leadSuit ?? null;

    // If no lead suit, all cards are playable
    if (leadSuit === null) {
      return player.hand;
    }

    // Check if player can follow suit
    const canFollow = player.hand.some(
      (card) => card.type === 'NUMBER' && card.suit === leadSuit
    );

    if (!canFollow) {
      return player.hand;
    }

    // Must follow suit OR play wizard/jester
    return player.hand.filter(
      (card) =>
        card.type === 'WIZARD' ||
        card.type === 'JESTER' ||
        (card.type === 'NUMBER' && card.suit === leadSuit)
    );
  }, [gameState, playerId]);

  return { getPlayableCards };
}
