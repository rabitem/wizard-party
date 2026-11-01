import { useRef, useMemo, useState, MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { TABLE_SURFACE } from '../../config/physics.config';
import {
  calculateCardAnimationDuration,
  calculateCardAnimationProgress,
  calculateCardPosition,
  calculateCardRotation,
  isSlowPlayedCardDrop,
  isCardAnimationComplete,
  isLandingImpactProgress,
  resolveCardAnimationPositions,
  updateRigidBody,
} from './cardAnimationHelpers';
import { blendFromOriginOrientation, calculateCardScale, toOriginQuaternion } from './cardAnimationOrigin';
import type {
  CardAnimationOffsets,
  PlayedCardOriginPose,
  ServerPhysicsState,
} from './physics-played-card.types';
import type { DropInfo } from '../../hooks/useDragToPlay';

interface UseCardAnimationParams {
  cardId: string;
  isLocalPlayer: boolean;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  startPosition: [number, number, number];
  scale: number;
  playOrder: number;
  totalCards: number;
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
  originPose?: PlayedCardOriginPose;
  seatRotation?: number;
  randomOffsets: CardAnimationOffsets;
  onImpact?: () => void;
  onAnimationComplete?: () => void;
}

interface UseCardAnimationResult {
  groupRef: MutableRefObject<THREE.Group | null>;
  rigidBodyRef: MutableRefObject<RapierRigidBody | null>;
  meshRef: MutableRefObject<THREE.Mesh | null>;
  isAnimating: boolean;
  dustActive: boolean;
  dustPosition: [number, number, number];
  setDustActive: (active: boolean) => void;
  effectiveStartPosition: [number, number, number];
}

interface UseResolvedAnimationParams {
  isLocalPlayer: boolean;
  targetPosition: [number, number, number];
  startPosition: [number, number, number];
  dropInfo?: DropInfo;
  physicsState?: ServerPhysicsState;
  seatRotation: number;
  randomOffsets: CardAnimationOffsets;
}

function useResolvedAnimation({
  isLocalPlayer,
  startPosition,
  targetPosition,
  dropInfo,
  physicsState,
  seatRotation,
  randomOffsets,
}: UseResolvedAnimationParams) {
  const { effectiveStartPosition, effectiveTargetPosition } = useMemo(
    () => resolveCardAnimationPositions({
      isLocalPlayer,
      startPosition,
      targetPosition,
      dropInfo,
      physicsState,
      seatRotation,
    }),
    [dropInfo, isLocalPlayer, physicsState, seatRotation, startPosition, targetPosition]
  );

  const isSlowDrop = useMemo(
    () => isSlowPlayedCardDrop(dropInfo, physicsState),
    [dropInfo, physicsState]
  );

  const animationDuration = useMemo(
    () => calculateCardAnimationDuration({
      isLocalPlayer,
      effectiveStartPosition,
      effectiveTargetPosition,
      durationMultiplier: randomOffsets.durationMult,
      dropInfo,
      physicsState,
    }),
    [dropInfo, effectiveStartPosition, effectiveTargetPosition, isLocalPlayer, physicsState, randomOffsets.durationMult]
  );

  return { effectiveStartPosition, effectiveTargetPosition, isSlowDrop, animationDuration };
}

/**
 * Hook that manages the card flight animation using useFrame.
 */
export function useCardAnimation({
  cardId,
  isLocalPlayer,
  targetPosition,
  targetRotation,
  startPosition,
  scale,
  playOrder,
  totalCards,
  dropInfo,
  physicsState,
  originPose,
  seatRotation = 0,
  randomOffsets,
  onImpact,
  onAnimationComplete,
}: UseCardAnimationParams): UseCardAnimationResult {
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const animationStartTime = useRef<number | null>(null);
  const landingImpactCalledRef = useRef<boolean>(false);
  const animationCompleteCalledRef = useRef<boolean>(false);
  const [dustActive, setDustActive] = useState(false);
  const [dustPosition, setDustPosition] = useState<[number, number, number]>([0, TABLE_SURFACE.CARD_REST_Y, 0]);
  const [isAnimating, setIsAnimating] = useState(true);
  const [lastResetCardId, setLastResetCardId] = useState(cardId);

  const { effectiveStartPosition, effectiveTargetPosition, isSlowDrop, animationDuration } =
    useResolvedAnimation({
      isLocalPlayer, startPosition, targetPosition, dropInfo, physicsState, seatRotation, randomOffsets,
    });

  // Only the local player's card replaces a rendered hand or dragged card
  const launchPose = isLocalPlayer ? originPose : undefined;
  const originQuaternion = useMemo(() => toOriginQuaternion(launchPose), [launchPose]);

  // Reset animation state when card changes
  if (cardId !== lastResetCardId) {
    setLastResetCardId(cardId);
    if (dustActive !== false) setDustActive(false);
    if (isAnimating !== true) setIsAnimating(true);
  }

  const lastAnimatedCardIdRef = useRef(cardId);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (cardId !== lastAnimatedCardIdRef.current) {
      lastAnimatedCardIdRef.current = cardId;
      animationStartTime.current = state.clock.elapsedTime;
      landingImpactCalledRef.current = false;
      animationCompleteCalledRef.current = false;
    }

    if (animationStartTime.current === null) {
      animationStartTime.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - animationStartTime.current;
    const rawProgress = Math.min(elapsed / animationDuration, 1);
    const posProgress = calculateCardAnimationProgress(rawProgress, isSlowDrop);

    const currentPos = calculateCardPosition({
      rawProgress, posProgress, effectiveStartPosition, effectiveTargetPosition, originPosition: launchPose?.position,
      targetRotation, randomOffsets, playOrder, totalCards, cardScale: scale, dropInfo, physicsState, isLocalPlayer,
    });

    const rotation = calculateCardRotation({
      rawProgress, posProgress, elapsedTime: state.clock.elapsedTime,
      isLocalPlayer, targetRotation, randomOffsets, isSlowDrop,
    });

    groupRef.current.position.copy(currentPos);
    groupRef.current.rotation.order = 'YXZ';
    groupRef.current.rotation.set(rotation.x, rotation.y, rotation.z);
    blendFromOriginOrientation(groupRef.current.quaternion, originQuaternion, rawProgress);
    groupRef.current.scale.setScalar(calculateCardScale(rawProgress, scale, launchPose?.scale));

    if (isAnimating) updateRigidBody(rigidBodyRef, groupRef.current, currentPos);

    if (isLandingImpactProgress(rawProgress) && !landingImpactCalledRef.current) {
      landingImpactCalledRef.current = true;
      setDustPosition([currentPos.x, TABLE_SURFACE.CARD_REST_Y, currentPos.z]);
      setDustActive(true);
      onImpact?.();
    }

    if (isCardAnimationComplete(rawProgress) && !animationCompleteCalledRef.current) {
      animationCompleteCalledRef.current = true;
      onAnimationComplete?.();
    }

    if (rawProgress >= 1 && isAnimating) setIsAnimating(false);
  });

  return { groupRef, rigidBodyRef, meshRef, isAnimating, dustActive, dustPosition, setDustActive, effectiveStartPosition };
}
