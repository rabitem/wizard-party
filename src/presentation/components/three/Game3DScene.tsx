'use client';

import { memo, useState, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { GamePhase, ICard } from '@shared/domain';
import { PlayerHand, type DragStatePublication } from '../PlayerHand';
import { GameTable } from '../GameTable';
import { CameraRelativeHand } from './CameraRelativeHand';
import { DraggedCard } from './DraggedCard';
import { PostProcessing } from './PostProcessing';
import { AMBIENT_USER_DATA, PhysicsActivityProbe, useRenderPulse } from './frame-scheduling';
import { useRenderQuality } from './render-quality';
import { ShaderWarmup } from './shader-warmup';
import { ThemedEnvironment } from './themed-environments';
import { useSelectedTableTheme } from '../table/table-theme';
import { TableShakeWrapper, TableShakeHandle } from './TableShakeWrapper';
import { PhysicsTable } from './PhysicsTable';
import { TrumpCollider } from './TrumpCollider';
import { SceneCamera } from './SceneCamera';
import { SceneLighting } from './SceneLighting';
import { SceneProbeSlot } from './scene-probe-slot';
import { capturePlayedCardOriginPose, shouldKeepPendingCardPlay } from './pending-card-play';
import { RAPIER_WORLD } from '../../config/rapier.config';
import { FRAME_SCHEDULING } from '../../config/render-quality.config';
import type { DragStateRef } from '../../hooks/useDragToPlay';
import type { Game3DSceneProps, PlayZoneState, DraggedCardState, DropInfo } from './Game3DSceneTypes';
import type { PendingCardPlay } from './physics-played-card.types';
import * as THREE from 'three';

/** Renders the currently dragged card as a 3D preview */
function DraggedCardPreview({
  cardId,
  worldPosition,
  proximity,
  cards,
  dragStateRef,
}: {
  cardId: string | null;
  worldPosition: THREE.Vector3;
  proximity: number;
  cards: ICard[];
  dragStateRef: DragStateRef | null;
}) {
  if (!cardId) return null;
  const draggedCard = cards.find(c => c.id === cardId);
  if (!draggedCard) return null;
  return <DraggedCard key={draggedCard.id} card={draggedCard} worldPosition={worldPosition} playZoneProximity={proximity} dragStateRef={dragStateRef ?? undefined} />;
}

/** Hook for managing drag state */
function useDragState() {
  const [playZoneState, setPlayZoneState] = useState<PlayZoneState>({ visible: false, proximity: 0, isInZone: false });
  const [draggedCardState, setDraggedCardState] = useState<DraggedCardState>({ cardId: null, worldPosition: new THREE.Vector3() });
  const [dragStateRef, setDragStateRef] = useState<DragStateRef | null>(null);

  const handleDragStateChange = useCallback((publication: DragStatePublication) => {
    // A held play keeps the dragged card on the table, frozen at its drop pose, until the
    // server's state removes the card from the hand (the played card mounts that frame).
    const showsDraggedCard = publication.isDragging || publication.isHeld;
    setPlayZoneState({
      visible: publication.isDragging,
      proximity: publication.proximity,
      isInZone: publication.isInZone,
    });
    setDraggedCardState({
      cardId: showsDraggedCard ? publication.cardId : null,
      worldPosition: publication.worldPosition ?? new THREE.Vector3(),
    });
    setDragStateRef(showsDraggedCard ? publication.dragStateRef : null);
  }, []);

  return { playZoneState, draggedCardState, dragStateRef, handleDragStateChange };
}

/** Hook for table shake and card play handlers */
function useTableHandlers(
  onCardPlay: Game3DSceneProps['onCardPlay'],
  onCardLand: Game3DSceneProps['onCardLand'],
  phase: GamePhase
) {
  const tableShakeRef = useRef<TableShakeHandle>(null);
  const scene = useThree((state) => state.scene);
  const [pendingDropInfo, setPendingDropInfo] = useState<PendingCardPlay | null>(null);

  // Card ids repeat every deal: forget the last play once a new deal starts
  if (pendingDropInfo && !shouldKeepPendingCardPlay(phase)) {
    setPendingDropInfo(null);
  }

  const handleCardPlay = useCallback((cardId: string, dropInfo?: DropInfo) => {
    // Always replace the previous play so a tap never inherits an older drag's drop info
    setPendingDropInfo({
      cardId,
      dropInfo,
      originPose: capturePlayedCardOriginPose(scene, cardId, dropInfo !== undefined),
    });
    onCardPlay(cardId, dropInfo);
  }, [onCardPlay, scene]);

  const handleCardLand = useCallback((card: ICard) => {
    tableShakeRef.current?.shake();
    onCardLand?.(card);
  }, [onCardLand]);

  return { tableShakeRef, pendingDropInfo, handleCardPlay, handleCardLand };
}

function Game3DSceneView({
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
  orderedCards,
  handAnimation,
  trickResult,
  onCardLand,
  onTrickCollectComplete,
  onAllCardsLanded,
  onHandAnimationProgress,
  isWaitingForCardsToLand,
  getCardPhysicsState,
  shouldShowPlayedCard,
  shouldAnimatePlayedCard,
  onPlayedCardAnimationComplete,
  collectionAnimationMode,
}: Game3DSceneProps) {
  const localPlayer = gameState.players.find((p) => p.id === playerId);
  const localPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
  const isCurrentPlayer = localPlayerIndex === gameState.currentPlayerIndex;

  const { tableShakeRef, pendingDropInfo, handleCardPlay, handleCardLand } =
    useTableHandlers(onCardPlay, onCardLand, gameState.phase);
  const { playZoneState, draggedCardState, dragStateRef, handleDragStateChange } = useDragState();

  // Server updates start deals, flights and collections: render them at full rate from frame one
  useRenderPulse(gameState, FRAME_SCHEDULING.STATE_CHANGE_ACTIVE_MS);
  useRenderPulse(trickResult, FRAME_SCHEDULING.STATE_CHANGE_ACTIVE_MS);
  const tableTheme = useSelectedTableTheme();
  const { structuralTier } = useRenderQuality();

  const showHand = localPlayer && (gameState.phase === GamePhase.BIDDING || gameState.phase === GamePhase.TRUMP_SELECTION || gameState.phase === GamePhase.PLAYING);
  const handCards = orderedCards.length > 0 ? orderedCards : (localPlayer?.hand ?? []);

  return (
    <>
      <SceneCamera
        isMobile={isMobile}
        playerCount={gameState.players.length}
        lockCamera={isDraggingCard || playZoneState.visible}
      />

      {/* Room decor animates at the scheduler's ambient rate, never forcing full-rate frames */}
      <group userData={AMBIENT_USER_DATA}>
        <ThemedEnvironment />
      </group>

      <SceneLighting />

      <Physics
        gravity={RAPIER_WORLD.GRAVITY}
        timeStep={RAPIER_WORLD.TIMESTEP}
        debug={RAPIER_WORLD.DEBUG}
      >
        <PhysicsActivityProbe />
        <PhysicsTable />
        <TrumpCollider />

        <DraggedCardPreview cardId={draggedCardState.cardId} worldPosition={draggedCardState.worldPosition} proximity={playZoneState.proximity} cards={handCards} dragStateRef={dragStateRef} />

        <TableShakeWrapper ref={tableShakeRef}>
          <GameTable
            currentTrick={gameState.currentTrick}
            players={gameState.players}
            localPlayerId={playerId}
            trumpSuit={gameState.trumpSuit}
            currentPlayerIndex={gameState.currentPlayerIndex}
            dealerIndex={gameState.dealerIndex}
            trickWinnerId={trickResult?.winnerId}
            onCardLand={handleCardLand}
            onTrickCollectComplete={onTrickCollectComplete}
            onAllCardsLanded={onAllCardsLanded}
            gamePhase={gameState.phase}
            pendingDropInfo={pendingDropInfo}
            isWaitingForCardsToLand={isWaitingForCardsToLand}
            getCardPhysicsState={getCardPhysicsState}
            shouldShowPlayedCard={shouldShowPlayedCard}
            shouldAnimatePlayedCard={shouldAnimatePlayedCard}
            onPlayedCardAnimationComplete={onPlayedCardAnimationComplete}
            collectionAnimationMode={collectionAnimationMode}
          />
        </TableShakeWrapper>
      </Physics>

      {showHand ? (
        <CameraRelativeHand>
          <PlayerHand cards={handCards} playableCardIds={isCurrentPlayer ? playableCardIds : []} selectedCardId={selectedCardId} onCardSelect={onCardSelect} onCardPlay={handleCardPlay} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragStateChange={handleDragStateChange} onAnimationProgress={onHandAnimationProgress} position={[0, 0, 0]} rotation={[0, 0, 0]} isCurrentPlayer={isCurrentPlayer} animation={handAnimation} />
        </CameraRelativeHand>
      ) : null}

      <PostProcessing />

      <ShaderWarmup warmupKey={`${tableTheme.id}:${structuralTier}`} />

      <SceneProbeSlot />
    </>
  );
}

/** Memoized: a snapshot that changed nothing it shows (structurally shared) skips it. */
export const Game3DScene = memo(Game3DSceneView);
