'use client';

import { useMemo, Suspense } from 'react';
import { ITrick, IPlayer, Suit, SUIT_COLORS } from '@shared/domain';
import { AnimatedPlayedCard } from './AnimatedPlayedCard';
import { OpponentHand } from './OpponentHand';
import {
  FeltSurface,
  WoodTableRim,
  TrumpIndicator,
  PlayerSeat,
  PlayerCard,
  CollectingCard,
  PlayerEmote,
  PlayerChatBubble,
  ChipStacks,
  Coasters,
  TableCenterGlow,
} from './table';
import { TrickWinParticles, SparkleParticles } from './three/TrickWinParticles';

interface EmoteData {
  id: string;
  playerId: string;
  playerName: string;
  emoteId: string;
}

interface ChatData {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
}

interface GameTableProps {
  currentTrick: ITrick | null;
  players: IPlayer[];
  localPlayerId: string;
  trumpSuit: Suit | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  emotes?: EmoteData[];
  chatMessages?: ChatData[];
  trickWinnerId?: string | null;
}

export function GameTable({
  currentTrick,
  players,
  localPlayerId,
  trumpSuit,
  currentPlayerIndex,
  dealerIndex,
  emotes = [],
  chatMessages = [],
  trickWinnerId,
}: GameTableProps) {
  // Calculate player positions around table
  const playerPositions = useMemo(() => {
    const count = players.length;
    const localIndex = players.findIndex((p) => p.id === localPlayerId);
    const positions: {
      cardPos: [number, number, number];
      labelPos: [number, number, number];
      seatPos: [number, number, number];
      startPos: [number, number, number];
      handPos: [number, number, number];
      rotation: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const relativeIndex = (i - localIndex + count) % count;
      const angle = (relativeIndex / count) * Math.PI * 2 - Math.PI / 2;

      const tableRadius = 2.6;
      const cardRadius = 1.3;
      const x = Math.cos(angle);
      const z = Math.sin(angle);

      positions.push({
        cardPos: [x * cardRadius * 0.75, 0.18, z * cardRadius * 0.75],
        labelPos: [x * tableRadius * 0.85, 0.55, z * tableRadius * 0.85],
        seatPos: [x * tableRadius, -0.08, z * tableRadius],
        startPos: [x * tableRadius * 0.95, 0.15, z * tableRadius * 0.95],
        handPos: [x * tableRadius * 0.95, 0.15, z * tableRadius * 0.95],
        rotation: -angle + Math.PI / 2,
      });
    }

    return positions;
  }, [players, localPlayerId]);

  return (
    <group>
      {/* TABLE SURFACE */}
      <Suspense
        fallback={
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <ringGeometry args={[2.9, 3.3, 32]} />
            <meshStandardMaterial color="#5c3a21" roughness={0.8} />
          </mesh>
        }
      >
        <WoodTableRim />
      </Suspense>

      <Suspense
        fallback={
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <circleGeometry args={[2.88, 32]} />
            <meshStandardMaterial color="#1a5c3a" roughness={0.95} />
          </mesh>
        }
      >
        <FeltSurface />
      </Suspense>

      {/* TRUMP INDICATOR */}
      <TrumpIndicator suit={trumpSuit} />

      {/* Trump glow */}
      <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshStandardMaterial
          color={trumpSuit ? SUIT_COLORS[trumpSuit] : '#6644aa'}
          emissive={trumpSuit ? SUIT_COLORS[trumpSuit] : '#6644aa'}
          emissiveIntensity={0.15}
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* PLAYER AREAS */}
      {players.map((player, index) => {
        const pos = playerPositions[index];
        if (!pos) return null;

        const isCurrentTurn = index === currentPlayerIndex;
        const isDealer = index === dealerIndex;
        const isLocalPlayer = player.id === localPlayerId;
        const playedCard = currentTrick?.cards.find((pc) => pc.playerId === player.id);

        return (
          <group key={player.id}>
            <PlayerSeat position={pos.seatPos} isCurrentTurn={isCurrentTurn} isDealer={isDealer} />

            <PlayerCard
              position={pos.labelPos}
              player={player}
              isCurrentTurn={isCurrentTurn}
              isLocalPlayer={isLocalPlayer}
              playerIndex={index}
            />

            {!isLocalPlayer && player.hand.length > 0 && (
              <OpponentHand cardCount={player.hand.length} position={pos.handPos} rotation={pos.rotation} />
            )}

            {playedCard && !trickWinnerId && (
              <AnimatedPlayedCard
                card={playedCard.card}
                targetPosition={pos.cardPos}
                targetRotation={[-Math.PI / 2, pos.rotation, 0]}
                startPosition={pos.startPos}
                scale={0.9}
                isLocalPlayer={isLocalPlayer}
                cardId={`${player.id}-${playedCard.card.id}`}
              />
            )}
          </group>
        );
      })}

      {/* COLLECTING CARDS ANIMATION */}
      {trickWinnerId &&
        currentTrick?.cards &&
        currentTrick.cards.length > 0 &&
        (() => {
          const winnerIndex = players.findIndex((p) => p.id === trickWinnerId);
          const winnerPos = playerPositions[winnerIndex];
          if (!winnerPos) return null;

          const targetPosition: [number, number, number] = [
            winnerPos.seatPos[0] * 0.8,
            0.1,
            winnerPos.seatPos[2] * 0.8,
          ];

          return currentTrick.cards.map((playedCard, cardIndex) => {
            const playerIndex = players.findIndex((p) => p.id === playedCard.playerId);
            const playerPos = playerPositions[playerIndex];
            if (!playerPos) return null;

            return (
              <CollectingCard
                key={`collecting-${playedCard.playerId}-${playedCard.card.id}`}
                card={{
                  id: playedCard.card.id,
                  type: playedCard.card.type,
                  suit: playedCard.card.suit,
                  value: playedCard.card.value,
                }}
                startPosition={playerPos.cardPos}
                targetPosition={targetPosition}
                delay={cardIndex * 0.08}
                rotation={playerPos.rotation}
              />
            );
          });
        })()}

      {/* EMOTES AND CHAT */}
      {emotes.map((emote) => {
        const playerIndex = players.findIndex((p) => p.id === emote.playerId);
        const pos = playerPositions[playerIndex];
        if (!pos) return null;
        return (
          <PlayerEmote
            key={emote.id}
            position={[pos.labelPos[0], pos.labelPos[1] + 0.5, pos.labelPos[2]]}
            emoteId={emote.emoteId}
            playerName={emote.playerName}
          />
        );
      })}

      {chatMessages.map((chat) => {
        const playerIndex = players.findIndex((p) => p.id === chat.playerId);
        const pos = playerPositions[playerIndex];
        if (!pos) return null;
        return (
          <PlayerChatBubble
            key={chat.id}
            position={[pos.labelPos[0], pos.labelPos[1] + 0.5, pos.labelPos[2]]}
            message={chat.message}
            playerName={chat.playerName}
          />
        );
      })}

      {/* TRICK WIN PARTICLE EFFECTS */}
      <TrickWinParticles
        position={[0, 0.3, 0]}
        active={!!trickWinnerId}
        color="#ffd700"
      />

      {/* AMBIENT SPARKLES on table center */}
      <SparkleParticles position={[0, 0.05, 0]} radius={0.6} count={15} color="#ffd700" />

      {/* DECORATIVE ELEMENTS */}
      <ChipStacks />
      <Coasters />
      <TableCenterGlow />
    </group>
  );
}
