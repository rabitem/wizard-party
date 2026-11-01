import type { ICard } from '@shared/domain';
import type { ReactNode } from 'react';
import type { DropInfo } from '../../hooks/useDragToPlay';

/**
 * Physics state from server for synchronized multiplayer animations.
 * When provided, ensures all clients render identical card physics.
 */
export interface ServerPhysicsState {
  /** Velocity at the moment of throw (world units per second) */
  throwVelocity?: { x: number; y: number; z: number };
  /** Target landing position on the table - overrides targetPosition for non-local players */
  landingPosition?: { x: number; y: number; z: number };
  /** Starting position of the throw - overrides startPosition for non-local players */
  startPosition?: { x: number; y: number; z: number };
  /** Server-provided seed for consistent random variations across all clients */
  physicsSeed?: number;
}

/**
 * World-space pose of the hand or dragged card a local play launches from, so the played
 * card's first frame continues it instead of popping to a fixed seat pose.
 */
export interface PlayedCardOriginPose {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  scale: number;
}

/**
 * The local player's latest play. Its played and collecting cards start from where the
 * card actually left the hand.
 */
export interface PendingCardPlay {
  cardId: string;
  dropInfo?: DropInfo;
  originPose?: PlayedCardOriginPose;
}

export interface PhysicsPlayedCardProps {
  card: ICard;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  startPosition: [number, number, number];
  scale?: number;
  isLocalPlayer?: boolean;
  cardId: string;
  onImpact?: () => void;
  onAnimationComplete?: () => void;
  playOrder?: number;
  totalCards?: number;
  dropInfo?: DropInfo;
  /** Physics state from server for synchronized multiplayer animations */
  physicsState?: ServerPhysicsState;
  /** Local plays only: rendered pose of the card being replaced */
  originPose?: PlayedCardOriginPose;
  /** Yaw of the owner's seat in this client's scene; maps synchronized positions onto it */
  seatRotation?: number;
  children?: ReactNode;
}

/**
 * Random offsets for card animation, generated from a seed for consistent
 * multiplayer synchronization.
 */
export interface CardAnimationOffsets {
  posX: number;
  posZ: number;
  posY: number;
  finalRotZ: number;
  finalRotX: number;
  flightSpinZ: number;
  flightWobbleX: number;
  flightWobbleZ: number;
  wobbleFreq: number;
  throwStrength: number;
  gravityMult: number;
  bounceStrength: number;
  durationMult: number;
}
