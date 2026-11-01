'use client';

import { useMemo, useRef, useCallback } from 'react';
import { ICard } from '@shared/domain';
import { PhysicsCard3D, type PhysicsCard3DHandle } from '../three';
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
 * Cards use physics-based stacking with natural offsets for realism
 * Cards stay visible on the table after being won
 */
export function StackedDeck({ cards, position, rotation = 0 }: StackedDeckProps) {
  // Refs for physics cards to manage settling
  const cardRefs = useRef<Map<string, PhysicsCard3DHandle>>(new Map());
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

  // Handle settling of cards - put them to sleep for performance
  const handleCardRest = useCallback((cardId: string) => {
    const cardRef = cardRefs.current.get(cardId);
    if (cardRef) {
      // Card has settled - put it to sleep for performance
      cardRef.sleep();
    }
  }, []);

  // Set card ref
  const setCardRef = useCallback((cardId: string, ref: PhysicsCard3DHandle | null) => {
    if (ref) {
      cardRefs.current.set(cardId, ref);
    } else {
      cardRefs.current.delete(cardId);
    }
  }, []);

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

      {/* Visible stacked cards with physics-based positioning */}
      {visibleCards.map((card, index) => {
        const cardLayout = getStackedDeckCardLayout({
          cardId: card.id,
          hiddenCount,
          visibleIndex: index,
        });

        return (
          <PhysicsCard3D
            key={card.id}
            ref={(ref) => setCardRef(card.id, ref)}
            card={card}
            initialPosition={cardLayout.position}
            initialRotation={cardLayout.rotation}
            scale={cardLayout.scale}
            type="fixed" // Fixed for stable stacking (collection animation handles settling)
            playOrder={index}
            // The top card's shadow covers the stack; each card below would cost two shadow draws
            castShadow={index === visibleCards.length - 1}
            onRest={() => handleCardRest(card.id)}
          />
        );
      })}

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
