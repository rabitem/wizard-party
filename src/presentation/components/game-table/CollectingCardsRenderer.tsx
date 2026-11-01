'use client';

import { IPlayer, GamePhase, ICard } from '@shared/domain';
import { PhysicsCollectingCard } from '../table';
import { TABLE_SURFACE } from '../../config/physics.config';
import { calculatePlayedCardRestPosition, type PendingCardPlay, type ServerPhysicsState } from '../three';
import {
  getCollectingCardTargetLayout,
  getStackedDeckPosition,
} from '../table/stacked-deck-layout';
import type { CollectionAnimationMode } from '../../config/collection-animation.config';
import { getPlayedCardRestYaw } from './collecting-card-start-yaw';
import type { PlayerPosition, FrozenCollectingCards } from './types';

interface CollectingCardsRendererProps {
  players: IPlayer[];
  playerPositions: PlayerPosition[];
  localPlayerId: string;
  gamePhase?: GamePhase;
  frozenCollectingCards: FrozenCollectingCards | null;
  playerDecks: Map<string, ICard[]>;
  pendingDropInfo?: PendingCardPlay | null;
  getCardPhysicsState?: (cardId: string) => ServerPhysicsState | null;
  onCollectingCardComplete: (cardId: string) => void;
  collectionAnimationMode?: CollectionAnimationMode;
}

export function CollectingCardsRenderer({
  players,
  playerPositions,
  localPlayerId,
  gamePhase,
  frozenCollectingCards,
  playerDecks,
  pendingDropInfo,
  getCardPhysicsState,
  onCollectingCardComplete,
  collectionAnimationMode,
}: CollectingCardsRendererProps) {
  // Only render during appropriate game phases and when there are frozen cards
  if (
    !(gamePhase === GamePhase.PLAYING || gamePhase === GamePhase.ROUND_END || gamePhase === GamePhase.GAME_END) ||
    !frozenCollectingCards ||
    frozenCollectingCards.cards.length === 0
  ) {
    return null;
  }

  const winnerIndex = players.findIndex((p) => p.id === frozenCollectingCards.winnerId);
  if (winnerIndex < 0) {
    return null;
  }

  const winnerPos = playerPositions[winnerIndex];
  if (!winnerPos) {
    return null;
  }

  const winnerDeckCardCount = playerDecks.get(frozenCollectingCards.winnerId)?.length ?? 0;
  const deckPosition = getStackedDeckPosition(winnerPos.seatPos);
  const winnerRotation = winnerPos.rotation;

  return (
    <>
      {frozenCollectingCards.cards.map((playedCard, cardIndex) => {
        const playerIndex = players.findIndex((p) => p.id === playedCard.playerId);
        // Explicit bounds check for player position lookup
        const playerPos = playerIndex >= 0 ? playerPositions[playerIndex] : undefined;
        const isLocalPlayer = playedCard.playerId === localPlayerId;
        const cardDropInfo = isLocalPlayer && pendingDropInfo?.cardId === playedCard.card.id
          ? pendingDropInfo.dropInfo
          : undefined;
        const cardPhysicsState = !isLocalPlayer
          ? getCardPhysicsState?.(playedCard.card.id) ?? undefined
          : undefined;

        // If no position found, use cardPos from a valid player or table center
        // Using cardPos coordinates (where cards are played) rather than arbitrary center
        const fallbackStartPos = playerPos?.cardPos ?? [0, TABLE_SURFACE.CARD_REST_Y, 0] as [number, number, number];
        const targetLayout = getCollectingCardTargetLayout({
          cardId: playedCard.card.id,
          deckPosition,
          deckRotation: winnerRotation,
          existingCardCount: winnerDeckCardCount,
          collectingCardCount: frozenCollectingCards.cards.length,
          collectingCardIndex: cardIndex,
        });
        const playedCardAnimationId = `${playedCard.playerId}-${playedCard.card.id}`;
        const startPos = playerPos
          ? calculatePlayedCardRestPosition({
              cardId: playedCardAnimationId,
              isLocalPlayer,
              startPosition: playerPos.startPos,
              targetPosition: playerPos.cardPos,
              playOrder: cardIndex,
              totalCards: frozenCollectingCards.cards.length,
              dropInfo: cardDropInfo,
              physicsState: cardPhysicsState,
              seatRotation: playerPos.rotation,
            })
          : fallbackStartPos;
        // Start from the played card's resting yaw (seat rotation plus its settle roll), not the bare seat
        const startRot = playerPos
          ? getPlayedCardRestYaw({
              cardId: playedCardAnimationId,
              isLocalPlayer,
              seatRotation: playerPos.rotation,
              dropInfo: cardDropInfo,
              physicsState: cardPhysicsState,
            })
          : 0;

        return (
          <PhysicsCollectingCard
            key={`collecting-${playedCard.playerId}-${playedCard.card.id}`}
            card={playedCard.card}
            startPosition={startPos}
            targetPosition={targetLayout.position}
            startRotation={startRot}
            targetRotation={targetLayout.rotationY}
            targetScale={targetLayout.scale}
            animationMode={collectionAnimationMode}
            stackIndex={cardIndex}
            collectingCardCount={frozenCollectingCards.cards.length}
            onComplete={() => onCollectingCardComplete(playedCard.card.id)}
          />
        );
      })}
    </>
  );
}
