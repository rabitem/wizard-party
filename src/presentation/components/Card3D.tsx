'use client';

import { useRef, useState, useLayoutEffect, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import { CARD_MATERIAL_SLOT, getCardGeometry } from '../utils/card-geometry';
import { getHandCardRenderOrder } from '../utils/card-render-state';
import { useCardMaterials } from '../hooks/useCardMaterials';
import { useCardDragGesture } from '../hooks/useCardDragGesture';
import { sceneObjectName, type SceneObjectKind } from './three/scene-object-names';
import {
  ZERO_POSITION_OFFSET,
  applyReturnPose,
  createCardMotionState,
  getAnimationTargets,
  updateCardMotion,
  type CardMotionState,
  type CardReturnPose,
  type HandCardVisualState,
  type Vec3Tuple,
} from './Card3D.motion';

/** Longest frame step fed to the springs, so a stalled frame cannot overshoot. */
const MAX_FRAME_DT = 0.05;
/** Smallest tint change worth writing to the material */
const TINT_EPSILON = 0.004;

interface Card3DProps {
  card: ICard;
  /** Slot position. The card glides to it; changing it never snaps the card. */
  position?: Vec3Tuple;
  /** Animation offset (shuffle/sort) added on top of the slot position without smoothing. */
  positionOffset?: Vec3Tuple;
  rotation?: Vec3Tuple;
  onClick?: () => void;
  onDragStart?: (worldPosition: THREE.Vector3, screenX: number, screenY: number) => void;
  onDragMove?: (screenX: number, screenY: number) => void;
  onDragEnd?: () => void;
  /** The system cancelled the drag (pointercancel); the card must not be played. */
  onDragCancel?: () => void;
  onDoubleTap?: () => void;
  /** The card responds to hover, tap and drag right now */
  isPlayable?: boolean;
  /** Presentation in the hand (lift and face brightness); never transparency */
  visualState?: HandCardVisualState;
  isSelected?: boolean;
  isDragging?: boolean;
  /** When this pose changes, the card starts its way back to the slot from it. */
  returnFrom?: CardReturnPose;
  faceDown?: boolean;
  scale?: number;
  /** Hand cards: draw on top of the table (render order, no depth test) */
  renderOnTop?: boolean;
  /** Hand cards: slot index, so overlapping cards stack in hand order */
  stackIndex?: number;
  /** What the card is in the scene graph (the sandbox audit reads it): a card at rest on the table is a played card */
  sceneKind?: SceneObjectKind;
  children?: ReactNode;
}

/** Darken the card face (front material colour multiplies the face texture) */
export function applyCardTint(materials: readonly THREE.Material[], tint: number): void {
  const front = materials[CARD_MATERIAL_SLOT.FRONT];
  if (front instanceof THREE.MeshStandardMaterial || front instanceof THREE.MeshBasicMaterial) front.color.setScalar(tint);
}

function syncCardTint(materials: readonly THREE.Material[], p: CardMotionState): void {
  if (Math.abs(p.tint - p.appliedTint) <= TINT_EPSILON) return;
  applyCardTint(materials, p.tint);
  p.appliedTint = p.tint;
}

export function Card3D({
  card, position = [0, 0, 0], positionOffset = ZERO_POSITION_OFFSET, rotation = [0, 0, 0], onClick,
  onDragStart, onDragMove, onDragEnd, onDragCancel, onDoubleTap,
  isPlayable = false, visualState = 'idle', isSelected = false, isDragging = false, returnFrom, faceDown = false, scale = 1,
  renderOnTop = false, stackIndex = 0, sceneKind = 'hand-card', children,
}: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  // The group takes its first transform from props once; useFrame owns it from then on, so
  // a new slot glides instead of being committed straight onto the group by R3F.
  const [initialPosition] = useState<Vec3Tuple>(() => [
    position[0] + positionOffset[0], position[1] + positionOffset[1], position[2] + positionOffset[2],
  ]);
  const [initialRotation] = useState<Vec3Tuple>(rotation);
  const [randomPhase] = useState(() => Math.random() * Math.PI * 2);
  const physics = useRef<CardMotionState>(createCardMotionState(position, scale, visualState, randomPhase));
  // A card that mounts with a return pose (remount) must not replay an old return.
  const appliedReturnRef = useRef<CardReturnPose | undefined>(returnFrom);

  const { isDragging: localDragging, handlePointerDown: startGesture } = useCardDragGesture({
    groupRef, isPlayable, onDragStart, onDragMove, onDragEnd, onDragCancel, onDoubleTap,
  });
  const isCurrentlyDragging = isDragging || localDragging;
  const isActive = hovered && isPlayable;
  const materials = useCardMaterials(card, { faceDown, renderMode: renderOnTop ? 'hand' : 'table' });

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (returnFrom && returnFrom !== appliedReturnRef.current && !isCurrentlyDragging) {
      appliedReturnRef.current = returnFrom;
      applyReturnPose(group, physics.current, returnFrom, positionOffset);
    }
    const targets = getAnimationTargets(isSelected, isCurrentlyDragging, isActive, scale);
    updateCardMotion({
      group, physics: physics.current, targets,
      isSelected, isDragging: isCurrentlyDragging, position, positionOffset, rotation, visualState,
      dt: Math.min(delta, MAX_FRAME_DT), time: state.clock.elapsedTime,
    });
    syncCardTint(materials, physics.current);
  });

  // Layout effect: new materials get the current tint in the commit that attaches them, so no
  // frame draws them at the wrong brightness.
  useLayoutEffect(() => {
    applyCardTint(materials, physics.current.tint);
    physics.current.appliedTint = physics.current.tint;
  }, [materials]);

  const handlePointerDown = (e: THREE.Event & { stopPropagation: () => void; nativeEvent?: PointerEvent }) => {
    if (!isPlayable) return;
    e.stopPropagation();
    const nativeEvent = e.nativeEvent as PointerEvent | undefined;
    startGesture(nativeEvent?.clientX ?? 0, nativeEvent?.clientY ?? 0, nativeEvent);
  };

  const handleClick = (e: { stopPropagation: () => void }) => { e.stopPropagation(); onClick?.(); };
  const handleEnter = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isPlayable) { setHovered(true); document.body.style.cursor = 'pointer'; }
  };
  const handleLeave = (e: { stopPropagation: () => void }) => {
    e.stopPropagation(); setHovered(false);
    if (!localDragging) document.body.style.cursor = 'auto';
  };

  return (
    <group ref={groupRef} name={sceneObjectName(sceneKind, card.id)} position={initialPosition} rotation={initialRotation} visible={!isCurrentlyDragging}
      onClick={handleClick} onPointerEnter={handleEnter} onPointerLeave={handleLeave}
      onPointerDown={(e) => handlePointerDown(e as unknown as THREE.Event & { stopPropagation: () => void })}>
      {/* The hand floats before the camera and draws on top: its shadows would land on the table far from the cards */}
      <mesh geometry={getCardGeometry()} material={materials} castShadow={!renderOnTop} receiveShadow
        renderOrder={renderOnTop ? getHandCardRenderOrder(stackIndex) : 0} />
      {children}
    </group>
  );
}
