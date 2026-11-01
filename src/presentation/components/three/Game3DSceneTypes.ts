'use client';

import type { ICard, IGameState } from '@shared/domain';
import type { HandAnimation } from '../../hooks/useCardOrder';
import type { DropInfo } from '../../hooks/useDragToPlay';
import type { CollectionAnimationMode } from '../../config/collection-animation.config';
import type * as THREE from 'three';
import type { TrickResult } from '../../types/trick.types';

export type { TrickResult };

/**
 * Physics state for card animations from server broadcast
 */
export interface CardPhysicsState {
  throwVelocity?: { x: number; y: number; z: number };
  landingPosition?: { x: number; y: number; z: number };
  startPosition?: { x: number; y: number; z: number };
  physicsSeed?: number;
}

/**
 * Props for the main Game3DScene component
 */
export interface Game3DSceneProps {
  gameState: IGameState;
  playerId: string;
  selectedCardId: string | null;
  playableCardIds: string[];
  onCardSelect: (id: string) => void;
  onCardPlay: (id: string, dropInfo?: DropInfo) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDraggingCard: boolean;
  isMobile: boolean;
  orderedCards: ICard[];
  handAnimation: HandAnimation;
  trickResult: TrickResult | null;
  onCardLand?: (card: ICard) => void;
  onTrickCollectComplete?: () => void;
  onAllCardsLanded?: () => void;
  onHandAnimationProgress?: (progress: number) => void;
  isWaitingForCardsToLand?: boolean;
  /** Get physics state for a card from server broadcast - enables synchronized multiplayer animations */
  getCardPhysicsState?: (cardId: string) => CardPhysicsState | null;
  shouldShowPlayedCard?: (cardId: string) => boolean;
  shouldAnimatePlayedCard?: (cardId: string) => boolean;
  onPlayedCardAnimationComplete?: (cardId: string) => void;
  collectionAnimationMode?: CollectionAnimationMode;
}

/**
 * State for the play zone visibility and proximity
 */
export interface PlayZoneState {
  visible: boolean;
  proximity: number;
  isInZone: boolean;
}

/**
 * State for the dragged card rendering in world space
 */
export interface DraggedCardState {
  cardId: string | null;
  worldPosition: THREE.Vector3;
}

// Re-export types that are used by consumers
export type { DropInfo } from '../../hooks/useDragToPlay';
