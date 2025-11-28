'use client';

import { useState, useCallback } from 'react';
import { PerspectiveCamera, OrbitControls, ContactShadows } from '@react-three/drei';
import { GamePhase, ICard, IGameState } from '@shared/domain';
import { PlayerHand } from '../PlayerHand';
import { GameTable } from '../GameTable';
import { CameraRelativeHand } from './CameraRelativeHand';
import { DraggedCard } from './DraggedCard';
import { PostProcessing } from './PostProcessing';
import { AmbientDust } from './AmbientParticles';
import { PlayZone, GhostCard } from './PlayZone';
import { GameEnvironment, VolumetricLight, AtmosphericFog, TableHaze } from './Environment';
import type { HandAnimation } from '../../hooks/useCardOrder';
import { CAMERA_CONFIG } from '../../config/physics.config';
import * as THREE from 'three';

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

  // Play zone visibility state
  const [playZoneState, setPlayZoneState] = useState({
    visible: false,
    proximity: 0,
    isInZone: false,
  });

  // Dragged card state (for rendering in world space)
  const [draggedCardState, setDraggedCardState] = useState<{
    cardId: string | null;
    worldPosition: THREE.Vector3;
  }>({
    cardId: null,
    worldPosition: new THREE.Vector3(),
  });

  // Handle drag state changes from PlayerHand
  const handleDragStateChange = useCallback((
    isDragging: boolean,
    proximity: number,
    isInZone: boolean,
    cardId: string | null,
    worldPosition: THREE.Vector3 | null
  ) => {
    setPlayZoneState({
      visible: isDragging,
      proximity,
      isInZone,
    });
    setDraggedCardState({
      cardId: isDragging ? cardId : null,
      worldPosition: worldPosition ?? new THREE.Vector3(),
    });
  }, []);

  // Camera settings from centralized config
  const cameraPosition = isMobile ? CAMERA_CONFIG.MOBILE.POSITION : CAMERA_CONFIG.DESKTOP.POSITION;
  const cameraFov = isMobile ? CAMERA_CONFIG.MOBILE.FOV : CAMERA_CONFIG.DESKTOP.FOV;

  return (
    <>
      {/* Camera with cinematic look using config values */}
      <PerspectiveCamera makeDefault position={cameraPosition} fov={cameraFov} near={0.1} far={100} />
      <OrbitControls
        target={CAMERA_CONFIG.TARGET}
        minDistance={isMobile ? CAMERA_CONFIG.MIN_DISTANCE.MOBILE : CAMERA_CONFIG.MIN_DISTANCE.DESKTOP}
        maxDistance={isMobile ? CAMERA_CONFIG.MAX_DISTANCE.MOBILE : CAMERA_CONFIG.MAX_DISTANCE.DESKTOP}
        maxPolarAngle={CAMERA_CONFIG.MAX_POLAR_ANGLE}
        minPolarAngle={CAMERA_CONFIG.MIN_POLAR_ANGLE}
        enablePan={false}
        enableRotate={!isDraggingCard && !playZoneState.visible}
        rotateSpeed={CAMERA_CONFIG.ROTATE_SPEED}
        zoomSpeed={CAMERA_CONFIG.ZOOM_SPEED}
        enableDamping
        dampingFactor={CAMERA_CONFIG.DAMPING_FACTOR}
      />

      {/* Environment map for reflections */}
      <GameEnvironment />

      {/* Atmospheric fog for depth */}
      <AtmosphericFog color="#0a0a15" near={10} far={30} />

      {/* Improved lighting setup */}
      <ambientLight intensity={0.35} color="#b8c4d8" />

      {/* Main key light - warm, dramatic, casts shadows */}
      <directionalLight
        position={[5, 14, 5]}
        intensity={1.4}
        color="#fff0e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={3}
      />

      {/* Fill light - cooler, softer */}
      <directionalLight
        position={[-6, 10, -6]}
        intensity={0.3}
        color="#d0e0ff"
      />

      {/* Rim light for depth separation */}
      <directionalLight
        position={[0, 8, -10]}
        intensity={0.25}
        color="#ffd0a0"
      />

      {/* Overhead table spotlight */}
      <spotLight
        position={[0, 12, 0]}
        angle={0.45}
        penumbra={0.9}
        intensity={1.2}
        color="#fffaf5"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0003}
        distance={20}
        decay={2}
      />

      {/* Accent lights around table edge */}
      <pointLight position={[3, 1, 3]} intensity={0.15} color="#ff8866" distance={6} decay={2} />
      <pointLight position={[-3, 1, 3]} intensity={0.15} color="#6688ff" distance={6} decay={2} />
      <pointLight position={[0, 1, -3]} intensity={0.1} color="#88ff66" distance={5} decay={2} />

      {/* Environment - dark casino floor */}
      <color attach="background" args={['#050508']} />

      {/* Ground plane with soft contact shadows */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <circleGeometry args={[15, 64]} />
        <meshStandardMaterial
          color="#0a0a12"
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* Contact shadows for grounded look */}
      <ContactShadows
        position={[0, -0.19, 0]}
        opacity={0.5}
        scale={12}
        blur={2.5}
        far={4}
        resolution={512}
        color="#000000"
      />

      {/* Volumetric light from overhead */}
      <VolumetricLight position={[0, 10, 0]} color="#fff8e8" intensity={0.8} />

      {/* Subtle table haze */}
      <TableHaze />

      {/* Atmospheric dust particles */}
      <AmbientDust count={60} radius={7} height={6} />

      {/* Play Zone indicator */}
      <PlayZone
        visible={playZoneState.visible}
        proximity={playZoneState.proximity}
        isInZone={playZoneState.isInZone}
        position={[0, 0.03, 0]}
      />

      {/* Ghost card preview */}
      <GhostCard
        visible={playZoneState.visible && playZoneState.proximity > 0.5}
        position={[0, 0.15, 0]}
      />

      {/* Dragged card rendered in world space */}
      {draggedCardState.cardId && localPlayer && (() => {
        const cards = orderedCards.length > 0 ? orderedCards : localPlayer.hand;
        const draggedCard = cards.find(c => c.id === draggedCardState.cardId);
        if (!draggedCard) return null;
        return (
          <DraggedCard
            card={draggedCard}
            worldPosition={draggedCardState.worldPosition}
            playZoneProximity={playZoneState.proximity}
            isInPlayZone={playZoneState.isInZone}
          />
        );
      })()}

      {/* Game table with all decorations */}
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

      {/* Local player's hand */}
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
            onDragStateChange={handleDragStateChange}
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            isCurrentPlayer={isCurrentPlayer}
            animation={handAnimation}
          />
        </CameraRelativeHand>
      )}

      {/* Post-processing effects */}
      <PostProcessing quality="medium" />
    </>
  );
}
