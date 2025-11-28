'use client';

import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import { GamePhase, ICard, IGameState } from '@shared/domain';
import { PlayerHand } from '../PlayerHand';
import { GameTable } from '../GameTable';
import { CameraRelativeHand } from './CameraRelativeHand';
import type { HandAnimation } from '../../hooks/useCardOrder';

interface EmoteDisplayData {
  id: string;
  emoteId: string;
  playerId: string;
  playerName: string;
}

interface ChatDisplayData {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
}

interface TrickResult {
  winnerId: string;
  winnerName: string;
  timestamp: number;
}

interface Game3DSceneProps {
  gameState: IGameState;
  playerId: string;
  selectedCardId: string | null;
  playableCardIds: string[];
  onCardSelect: (id: string) => void;
  onCardPlay: (id: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDraggingCard: boolean;
  isMobile: boolean;
  displayEmotes: EmoteDisplayData[];
  displayChatMessages: ChatDisplayData[];
  orderedCards: ICard[];
  handAnimation: HandAnimation;
  trickResult: TrickResult | null;
}

export function Game3DScene({
  gameState,
  playerId,
  selectedCardId,
  playableCardIds,
  onCardSelect,
  onCardPlay,
  onDragStart,
  onDragEnd,
  isDraggingCard,
  isMobile,
  displayEmotes,
  displayChatMessages,
  orderedCards,
  handAnimation,
  trickResult,
}: Game3DSceneProps) {
  const localPlayer = gameState.players.find((p) => p.id === playerId);
  const localPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
  const isCurrentPlayer = localPlayerIndex === gameState.currentPlayerIndex;

  // Camera settings
  const cameraPosition: [number, number, number] = isMobile ? [0, 7, 6] : [0, 6, 7];
  const cameraFov = isMobile ? 65 : 55;

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPosition} fov={cameraFov} />
      <OrbitControls
        target={[0, 0.5, 0]}
        minDistance={isMobile ? 4 : 5}
        maxDistance={isMobile ? 10 : 14}
        maxPolarAngle={Math.PI * 65 / 180}
        minPolarAngle={Math.PI / 6}
        enablePan={false}
        enableRotate={!isDraggingCard}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
      />

      {/* Improved lighting for photorealistic materials */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} color="#fff5e6" />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} color="#e6f0ff" />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#fff8f0" distance={15} decay={2} />
      <spotLight
        position={[0, 8, 0]}
        angle={0.6}
        penumbra={0.5}
        intensity={0.8}
        color="#fffaf0"
        target-position={[0, 0, 0]}
      />

      {/* Environment */}
      <color attach="background" args={['#0a0a18']} />

      {/* Simple ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <circleGeometry args={[12, 24]} />
        <meshBasicMaterial color="#080810" />
      </mesh>

      {/* Game table */}
      <GameTable
        currentTrick={gameState.currentTrick}
        players={gameState.players}
        localPlayerId={playerId}
        trumpSuit={gameState.trumpSuit}
        currentPlayerIndex={gameState.currentPlayerIndex}
        dealerIndex={gameState.dealerIndex}
        emotes={displayEmotes}
        chatMessages={displayChatMessages}
        trickWinnerId={trickResult?.winnerId}
      />

      {/* Local player's hand - follows camera */}
      {localPlayer && (
        gameState.phase === GamePhase.BIDDING ||
        gameState.phase === GamePhase.TRUMP_SELECTION ||
        gameState.phase === GamePhase.PLAYING
      ) && (
        <CameraRelativeHand>
          <PlayerHand
            cards={orderedCards.length > 0 ? orderedCards : localPlayer.hand}
            playableCardIds={isCurrentPlayer ? playableCardIds : []}
            selectedCardId={selectedCardId}
            onCardSelect={onCardSelect}
            onCardPlay={onCardPlay}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            isCurrentPlayer={isCurrentPlayer}
            animation={handAnimation}
          />
        </CameraRelativeHand>
      )}
    </>
  );
}
