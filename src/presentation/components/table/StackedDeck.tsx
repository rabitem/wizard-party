'use client';

import { useMemo } from 'react';
import { ICard } from '@shared/domain';
import { StackedDeckCards } from './StackedDeckCards';
import { useCardBackTexture } from '../../hooks/useCardBackTexture';
import {
  STACKED_DECK_LAYOUT,
  getStackedDeckCardLayout,
  getHiddenDeckBaseY,
  getVisibleDeckCardY,
} from './stacked-deck-layout';

interface StackedDeckProps {
  cards: ICard[];
  position: [number, number, number];
  rotation?: number;
}

/**
 * Renders a persistent stack of collected cards near a player
 * Fixed colliders and merged face/back meshes share the same natural stack offsets
 * Cards stay visible on the table after being won
 */
export function StackedDeck({ cards, position, rotation = 0 }: StackedDeckProps) {
  const backTexture = useCardBackTexture();

  // Dedupe cards by ID (in case of duplicate additions)
  // MUST be before conditional return to respect rules of hooks
  const uniqueCards = useMemo(() => {
    if (cards.length === 0) return [];
    const seen = new Set<string>();
    const deduped: ICard[] = [];
    // Iterate backwards to keep the most recent instance of each card
    for (let i = cards.length - 1; i >= 0; i--) {
      if (!seen.has(cards[i].id)) {
        seen.add(cards[i].id);
        deduped.unshift(cards[i]);
      }
    }
    return deduped;
  }, [cards]);

  // Only render visible cards with physics (limited for performance)
  const visibleCards = uniqueCards.slice(-STACKED_DECK_LAYOUT.MAX_VISIBLE_PHYSICS_CARDS);
  const hiddenCount = Math.max(0, uniqueCards.length - STACKED_DECK_LAYOUT.MAX_VISIBLE_PHYSICS_CARDS);

  const placements = useMemo(() => visibleCards.map((card, index) => ({ card,
    layout: getStackedDeckCardLayout({ cardId: card.id, hiddenCount, visibleIndex: index }),
  })), [uniqueCards, hiddenCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Early return after all hooks
  if (cards.length === 0) return null;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base mesh representing hidden cards (non-physics for performance) */}
      {hiddenCount > 0 && (
        <mesh
          position={[0, getHiddenDeckBaseY(hiddenCount), 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[
            STACKED_DECK_LAYOUT.BASE_WIDTH,
            STACKED_DECK_LAYOUT.BASE_HEIGHT,
            STACKED_DECK_LAYOUT.BASE_THICKNESS * hiddenCount,
          ]} />
          <meshStandardMaterial color={backTexture ? "#ffffff" : "#1a2a48"} roughness={0.8} map={backTexture} />
        </mesh>
      )}

      <StackedDeckCards cards={placements} />

      {/* Card count indicator */}
      {uniqueCards.length > 1 && (
        <group position={[
          STACKED_DECK_LAYOUT.BASE_WIDTH * 0.6,
          getVisibleDeckCardY({
            hiddenCount,
            visibleIndex: Math.max(0, visibleCards.length - 1),
          }) + 0.03,
          0,
        ]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.06, 16]} />
            <meshBasicMaterial color="#1a1a2e" transparent opacity={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}
