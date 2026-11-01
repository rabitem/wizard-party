'use client';

import { memo, useLayoutEffect, useRef, type ReactNode } from 'react';
import { IPlayer, ITrick, GamePhase, ICard } from '@shared/domain';
import { PhysicsPlayedCard, calculatePlayedCardRestPosition, type PendingCardPlay, type ServerPhysicsState } from '../three';
import { OpponentHand } from '../OpponentHand';
import { Card3D } from '../Card3D';
import { PlayerSeat } from '../table';
import { PlayedCardOwnerBadge } from './PlayedCardOwnerBadge';
import { getPlayedCardRestYaw } from './collecting-card-start-yaw';
import { getStaticPlayedCardPosition } from './played-card-layout';
import type { PlayerPosition } from './types';

interface PlayerAreaRendererProps {
  players: IPlayer[];
  playerPositions: PlayerPosition[];
  localPlayerId: string;
  currentPlayerIndex: number;
  dealerIndex: number;
  currentTrick: ITrick | null;
  trickWinnerId?: string | null;
  gamePhase?: GamePhase;
  isWaitingForCardsToLand?: boolean;
  pendingDropInfo?: PendingCardPlay | null;
  getCardPhysicsState?: (cardId: string) => ServerPhysicsState | null;
  shouldShowPlayedCard?: (cardId: string) => boolean;
  shouldAnimatePlayedCard?: (cardId: string) => boolean;
  onPlayedCardImpact: (cardId: string) => void;
  onPlayedCardRest: (cardId: string) => void;
  onPlayedCardAlreadyRested: (cardId: string) => void;
  onPlayedCardAnimationComplete?: (cardId: string) => void;
}

function PlayerAreaRendererView({
  players,
  playerPositions,
  localPlayerId,
  currentPlayerIndex,
  dealerIndex,
  currentTrick,
  trickWinnerId,
  gamePhase,
  isWaitingForCardsToLand,
  pendingDropInfo,
  getCardPhysicsState,
  shouldShowPlayedCard,
  shouldAnimatePlayedCard,
  onPlayedCardImpact,
  onPlayedCardRest,
  onPlayedCardAlreadyRested,
  onPlayedCardAnimationComplete,
}: PlayerAreaRendererProps) {
  return (
    <>
      {players.map((player, index) => {
        const pos = playerPositions[index];
        if (!pos) return null;

        const isCurrentTurn = index === currentPlayerIndex;
        const isDealer = index === dealerIndex;
        const isLocalPlayer = player.id === localPlayerId;
        const playedCard = currentTrick?.cards.find((pc) => pc.playerId === player.id);
        const showPlayedCard = !playedCard || (shouldShowPlayedCard?.(playedCard.card.id) ?? true);

        return (
          <group key={player.id}>
            <PlayerSeat position={pos.seatPos} isCurrentTurn={isCurrentTurn} isDealer={isDealer} />

            {!isLocalPlayer && player.hand.length > 0 && (
              <OpponentHand cardCount={player.hand.length} position={pos.handPos} rotation={pos.rotation} />
            )}

            {/* Show played cards during PLAYING phase, or during ROUND_END/GAME_END if still waiting for cards to land */}
            {(gamePhase === GamePhase.PLAYING ||
              ((gamePhase === GamePhase.ROUND_END || gamePhase === GamePhase.GAME_END) && isWaitingForCardsToLand)) &&
              playedCard && showPlayedCard && !trickWinnerId ? <PlayedCardDisplay
                  playedCard={playedCard}
                  currentTrick={currentTrick}
                  player={player}
                  playerIndex={index}
                  pos={pos}
                  isLocalPlayer={isLocalPlayer}
                  pendingDropInfo={pendingDropInfo}
                  getCardPhysicsState={getCardPhysicsState}
                  shouldAnimatePlayedCard={shouldAnimatePlayedCard}
                  onPlayedCardImpact={onPlayedCardImpact}
                  onPlayedCardRest={onPlayedCardRest}
                  onPlayedCardAlreadyRested={onPlayedCardAlreadyRested}
                  onPlayedCardAnimationComplete={onPlayedCardAnimationComplete}
                /> : null}
          </group>
        );
      })}
    </>
  );
}

/** Memoized: a snapshot that changed nothing it shows (structurally shared) skips it. */
export const PlayerAreaRenderer = memo(PlayerAreaRendererView);

/** The local player's own play: drop info and the pose the card left the hand in */
function getOwnPendingPlay(
  isLocalPlayer: boolean,
  pendingDropInfo: PendingCardPlay | null | undefined,
  cardId: string
): PendingCardPlay | undefined {
  if (!isLocalPlayer || pendingDropInfo?.cardId !== cardId) return undefined;
  return pendingDropInfo;
}

interface PlayedCardDisplayProps {
  playedCard: { playerId: string; card: ICard };
  currentTrick: ITrick | null;
  player: IPlayer;
  playerIndex: number;
  pos: PlayerPosition;
  isLocalPlayer: boolean;
  pendingDropInfo?: PendingCardPlay | null;
  getCardPhysicsState?: (cardId: string) => ServerPhysicsState | null;
  shouldAnimatePlayedCard?: (cardId: string) => boolean;
  onPlayedCardImpact: (cardId: string) => void;
  onPlayedCardRest: (cardId: string) => void;
  onPlayedCardAlreadyRested: (cardId: string) => void;
  onPlayedCardAnimationComplete?: (cardId: string) => void;
}

function PlayedCardDisplay({
  playedCard,
  currentTrick,
  player,
  playerIndex,
  pos,
  isLocalPlayer,
  pendingDropInfo,
  getCardPhysicsState,
  shouldAnimatePlayedCard,
  onPlayedCardImpact,
  onPlayedCardRest,
  onPlayedCardAlreadyRested,
  onPlayedCardAnimationComplete,
}: PlayedCardDisplayProps) {
  // Find the play order of this card (index in trick.cards array)
  const playOrderIndex = currentTrick?.cards.findIndex(
    (pc) => pc.playerId === player.id
  ) ?? 0;
  const totalCardsInTrick = currentTrick?.cards.length ?? 1;

  const pendingPlay = getOwnPendingPlay(isLocalPlayer, pendingDropInfo, playedCard.card.id);

  // Get physics state for non-local players to enable synchronized animations
  const cardPhysicsState = !isLocalPlayer
    ? getCardPhysicsState?.(playedCard.card.id) ?? undefined
    : undefined;

  const shouldAnimate = shouldAnimatePlayedCard?.(playedCard.card.id) ?? true;
  const handleAnimationComplete = () => {
    onPlayedCardRest(playedCard.card.id);
    onPlayedCardAnimationComplete?.(playedCard.card.id);
  };
  const handleAlreadyRested = (cardId: string) => {
    onPlayedCardAlreadyRested(cardId);
    onPlayedCardAnimationComplete?.(cardId);
  };
  const ownerBadge = (
    <PlayedCardOwnerBadge
      player={player}
      playerIndex={playerIndex}
      playOrder={playOrderIndex}
      isLocalPlayer={isLocalPlayer}
    />
  );

  if (!shouldAnimate) {
    // At rest where its flight would have ended (scatter and roll included), so the collection
    // that replaces it starts from the same pose.
    const rest = { cardId: `${player.id}-${playedCard.card.id}`, isLocalPlayer, dropInfo: pendingPlay?.dropInfo, physicsState: cardPhysicsState, seatRotation: pos.rotation };
    const restPosition = calculatePlayedCardRestPosition({
      ...rest, startPosition: pos.startPos, targetPosition: pos.cardPos, playOrder: playOrderIndex, totalCards: totalCardsInTrick,
    });
    return (
      <StaticPlayedCard
        card={playedCard.card}
        cardId={playedCard.card.id}
        targetPosition={restPosition}
        targetRotation={[-Math.PI / 2, getPlayedCardRestYaw(rest), 0]}
        scale={0.9}
        onAlreadyRested={handleAlreadyRested}
      >
        {ownerBadge}
      </StaticPlayedCard>
    );
  }

  return (
    <PhysicsPlayedCard
      card={playedCard.card}
      targetPosition={pos.cardPos}
      targetRotation={[-Math.PI / 2, pos.rotation, 0]}
      startPosition={pos.startPos}
      scale={0.9}
      isLocalPlayer={isLocalPlayer}
      cardId={`${player.id}-${playedCard.card.id}`}
      onImpact={() => onPlayedCardImpact(playedCard.card.id)}
      onAnimationComplete={handleAnimationComplete}
      playOrder={playOrderIndex}
      totalCards={totalCardsInTrick}
      dropInfo={pendingPlay?.dropInfo}
      physicsState={cardPhysicsState}
      originPose={pendingPlay?.originPose}
      seatRotation={pos.rotation}
    >
      {ownerBadge}
    </PhysicsPlayedCard>
  );
}

function StaticPlayedCard({
  card,
  cardId,
  targetPosition,
  targetRotation,
  scale,
  onAlreadyRested,
  children,
}: {
  card: ICard;
  cardId: string;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  scale: number;
  onAlreadyRested: (cardId: string) => void;
  children?: ReactNode;
}) {
  // Once per card, before the next frame: the table never shows it as anything but rested.
  const onAlreadyRestedRef = useRef(onAlreadyRested);
  useLayoutEffect(() => {
    onAlreadyRestedRef.current = onAlreadyRested;
  });
  useLayoutEffect(() => {
    onAlreadyRestedRef.current(cardId);
  }, [cardId]);

  return (
    <Card3D
      card={card}
      position={getStaticPlayedCardPosition({ targetPosition, targetRotation, scale })}
      rotation={targetRotation}
      scale={scale}
      sceneKind="played-card"
    >
      {children}
    </Card3D>
  );
}
