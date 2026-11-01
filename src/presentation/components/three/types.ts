import * as THREE from 'three';
import { RapierRigidBody } from '@react-three/rapier';
import { ICard } from '@shared/domain';

/** Collision data passed to collision callbacks */
export interface CardCollisionData {
  /** Impact velocity magnitude */
  impactVelocity: number;
  /** Collision position in world space */
  position: THREE.Vector3;
  /** Collision normal direction (pointing away from this card) */
  normal: THREE.Vector3;
  /** Type of body collided with */
  colliderType: 'table' | 'card' | 'other';
  /** ID of other card if colliding with a card */
  otherCardId?: string;
}

export interface PhysicsCard3DHandle {
  /** Get the rigid body reference */
  getRigidBody: () => RapierRigidBody | null;
  /** Apply impulse to card */
  applyImpulse: (impulse: THREE.Vector3, torque?: THREE.Vector3) => void;
  /** Get current position */
  getPosition: () => THREE.Vector3 | null;
  /** Get current velocity */
  getVelocity: () => THREE.Vector3 | null;
  /** Check if card is at rest */
  isAtRest: () => boolean;
  /** Wake up the card from sleep state */
  wakeUp: () => void;
  /** Force card to sleep state */
  sleep: () => void;
}

export interface PhysicsCard3DProps {
  card: ICard;
  initialPosition: [number, number, number];
  initialRotation?: [number, number, number];
  initialVelocity?: [number, number, number];
  initialAngularVelocity?: [number, number, number];
  scale?: number;
  type?: 'dynamic' | 'kinematicPosition' | 'kinematicVelocity' | 'fixed';
  playOrder?: number;
  /** Casts a shadow (default). Cards under others in a stack do not need to: the top card covers them. */
  castShadow?: boolean;
  /** Enhanced collision callback with full collision data */
  onCollision?: (data: CardCollisionData) => void;
  /** Called when card comes to rest */
  onRest?: () => void;
  /** Called when card wakes from rest state */
  onWake?: () => void;
  userData?: Record<string, unknown>;
}

/** Collision payload from Rapier physics engine */
export interface CollisionPayload {
  manifold: { localNormal1: () => { x: number; y: number; z: number } };
  other: {
    rigidBody?: RapierRigidBody;
    rigidBodyObject?: { userData?: { cardId?: string } };
  };
  target: { rigidBody?: RapierRigidBody };
}
