"use client";

import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ICard } from "@shared/domain";
import type {
  CollectionAnimationMode,
} from "../../config/collection-animation.config";
import { CARD_DIMENSIONS } from "../../config/physics.config";
import {
  CARD_PHYSICS,
  interactionGroups,
} from "../../config/rapier.config";
import { useCardMaterials } from "../../hooks/useCardMaterials";
import { getCardGeometry } from "../../utils/card-geometry";
import { CardTrail } from "../three/CardTrail";
import { sceneObjectName } from "../three/scene-object-names";
import { CollectionArrivalBurst } from "./collection-arrival-burst";
import {
  COLLECTING_CARD_START_SCALE,
  COLLECTING_CARD_END_SCALE,
  getCollectingAnimationProfile,
  getCollectingCardStackedY,
  getCollectingFlyDelay,
  getCollectingModeTiming,
  getCollectingWaitDuration,
  getInitialCollectingCardTransform,
  resolveCollectingAnimationVariant,
} from "./collecting-card-animation";
import {
  resolveFrameAnimationResult,
  type CollectingAnimationPhase,
  type PhaseOffsets,
} from "./collecting-card-frame-animation";
import {
  useDurations,
  useRandomOffsets,
  useUnmountCleanup,
} from "./PhysicsCollectingCard.hooks";

interface PhysicsCollectingCardProps {
  card: ICard;
  startPosition: [number, number, number];
  targetPosition: [number, number, number];
  startRotation: number; // Resting yaw of the played card this card replaces
  targetRotation: number; // Winner's deck rotation
  targetScale?: number; // Final deck scale
  animationMode?: CollectionAnimationMode;
  stackIndex: number; // Which position in the stack (0, 1, 2, etc.)
  collectingCardCount: number; // Cards in the trick being collected
  onComplete?: () => void;
}

const CARD_WIDTH = CARD_DIMENSIONS.WIDTH;
const CARD_HEIGHT = CARD_DIMENSIONS.HEIGHT;
const CARD_THICKNESS = CARD_DIMENSIONS.THICKNESS;

/** Card mesh with the card's own face and back (same shared face as the played card it replaces) */
function CollectingCardMesh({ materials }: { materials: THREE.Material[] }) {
  return <mesh geometry={getCardGeometry()} material={materials} castShadow receiveShadow />;
}

interface CollectingCardFrameParams {
  groupRef: React.RefObject<THREE.Group | null>;
  rigidBodyRef: React.RefObject<RapierRigidBody | null>;
  startTimeRef: React.MutableRefObject<number | null>;
  stackedStartTimeRef: React.MutableRefObject<number | null>;
  arrivedRef: React.MutableRefObject<boolean>;
  completedRef: React.MutableRefObject<boolean>;
  onCompleteRef: React.MutableRefObject<(() => void) | undefined>;
  animationPhase: CollectingAnimationPhase;
  setAnimationPhase: React.Dispatch<React.SetStateAction<CollectingAnimationPhase>>;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
  isAnimating: boolean;
  startPosition: [number, number, number];
  centerPos: [number, number, number];
  targetPosition: [number, number, number];
  stackedY: number;
  startRotation: number;
  targetRotation: number;
  targetScale: number;
  randomOffsets: PhaseOffsets;
  animationVariant: ReturnType<typeof resolveCollectingAnimationVariant>;
  animationProfile: ReturnType<typeof getCollectingAnimationProfile>;
  stackIndex: number;
  collectingCardCount: number;
  gatherDuration: number;
  flyDuration: number;
  waitDuration: number;
  flyDelay: number;
}

function useCollectingCardFrame({
  groupRef,
  rigidBodyRef,
  startTimeRef,
  stackedStartTimeRef,
  arrivedRef,
  completedRef,
  onCompleteRef,
  animationPhase,
  setAnimationPhase,
  setIsAnimating,
  isAnimating,
  startPosition,
  centerPos,
  targetPosition,
  stackedY,
  startRotation,
  targetRotation,
  targetScale,
  randomOffsets,
  animationVariant,
  animationProfile,
  stackIndex,
  collectingCardCount,
  gatherDuration,
  flyDuration,
  waitDuration,
  flyDelay,
}: CollectingCardFrameParams): void {
  useFrame((state) => {
    if (!groupRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - startTimeRef.current;

    const result = resolveFrameAnimationResult({
      elapsed, gatherDuration, waitDuration, flyDelay, flyDuration, animationPhase,
      startPosition, centerPos, targetPosition, stackedY, startRotation, targetRotation,
      targetScale, randomOffsets, animationVariant, animationProfile, stackIndex, collectingCardCount,
    });

    if (result.isComplete && !arrivedRef.current) {
      arrivedRef.current = true;
      stackedStartTimeRef.current = state.clock.elapsedTime;
      setAnimationPhase('stacked');
      setIsAnimating(false);
    }

    if (arrivedRef.current && !completedRef.current) {
      const stackedElapsed = state.clock.elapsedTime - (stackedStartTimeRef.current ?? state.clock.elapsedTime);
      if (stackedElapsed >= animationProfile.settleDuration) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    }

    if (result.newPhase && !arrivedRef.current && animationPhase !== result.newPhase) setAnimationPhase(result.newPhase);
    const finalY = getCollectingCardStackedY([result.x, result.y, result.z], result.scale);
    groupRef.current.position.set(result.x, finalY, result.z);
    groupRef.current.rotation.order = 'YXZ'; groupRef.current.rotation.set(-Math.PI / 2, result.rotY, result.rotZ);
    groupRef.current.scale.setScalar(result.scale);

    if (rigidBodyRef.current && isAnimating) {
      rigidBodyRef.current.setNextKinematicTranslation({ x: result.x, y: finalY, z: result.z });
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, result.rotY, result.rotZ, 'YXZ'));
      rigidBodyRef.current.setNextKinematicRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });
    }
  });
}

/** PhysicsCollectingCard - Card with scripted collection animation and Rapier physics */
export function PhysicsCollectingCard({ card, startPosition, targetPosition, startRotation, targetRotation, targetScale = COLLECTING_CARD_END_SCALE, animationMode = 'random', stackIndex, collectingCardCount, onComplete }: PhysicsCollectingCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const startTimeRef = useRef<number | null>(null);
  const stackedStartTimeRef = useRef<number | null>(null);
  const arrivedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [animationPhase, setAnimationPhase] = useState<CollectingAnimationPhase>('gathering');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useUnmountCleanup(completedRef, onCompleteRef);

  const randomOffsets = useRandomOffsets(card.id);
  // Latched at mount: the timeline runs on a clock started at mount, so re-deriving it from a
  // style changed mid-collection would re-time and re-path cards already in motion. A new style
  // applies from the next trick, whose cards mount fresh.
  const [latchedMode] = useState(animationMode);
  const animationVariant = useMemo(
    () => resolveCollectingAnimationVariant({ mode: latchedMode, cardId: card.id, stackIndex }),
    [latchedMode, card.id, stackIndex]
  );
  const animationProfile = useMemo(() => getCollectingAnimationProfile(animationVariant), [animationVariant]);
  const modeTiming = useMemo(() => getCollectingModeTiming(latchedMode), [latchedMode]);
  const flyDelay = getCollectingFlyDelay(stackIndex, modeTiming);
  const waitDuration = getCollectingWaitDuration(modeTiming);
  const stackedY = getCollectingCardStackedY(targetPosition, targetScale);
  const centerPos: [number, number, number] = useMemo(() => [randomOffsets.gatherWobbleX * 0.5, 0.3, randomOffsets.gatherWobbleZ * 0.5], [randomOffsets.gatherWobbleX, randomOffsets.gatherWobbleZ]);
  const { gatherDuration, flyDuration } = useDurations({
    startPos: startPosition,
    centerPos,
    targetPos: targetPosition,
    stackedY,
    gatherMult: randomOffsets.durationMult * modeTiming.flyDurationMultiplier,
    flyMult: randomOffsets.durationMult * animationProfile.flyDurationMultiplier,
  });
  const initialTransform = useMemo(
    () => getInitialCollectingCardTransform({ startPosition, startRotation }),
    [startPosition, startRotation]
  );
  const materials = useCardMaterials(card);

  useCollectingCardFrame({
    groupRef, rigidBodyRef, startTimeRef, stackedStartTimeRef, arrivedRef,
    completedRef, onCompleteRef, animationPhase, setAnimationPhase, setIsAnimating,
    isAnimating, startPosition, centerPos, targetPosition, stackedY, startRotation,
    targetRotation, targetScale, randomOffsets, animationVariant, animationProfile,
    stackIndex, collectingCardCount, gatherDuration, flyDuration, waitDuration, flyDelay,
  });

  // Stable identity: a new userData object makes rapier re-apply the body's props (see PhysicsPlayedCard).
  const bodyUserData = useMemo(() => ({ cardId: card.id, phase: animationPhase, stackIndex }), [card.id, animationPhase, stackIndex]);

  return (
    <>
      <RigidBody ref={rigidBodyRef} type="kinematicPosition" position={initialTransform.position} rotation={initialTransform.rotation}
        collisionGroups={interactionGroups(CARD_PHYSICS.COLLISION_MEMBERSHIP, CARD_PHYSICS.COLLISION_FILTER)}
        userData={bodyUserData}>
        <CuboidCollider args={[(CARD_WIDTH * COLLECTING_CARD_START_SCALE) / 2, (CARD_HEIGHT * COLLECTING_CARD_START_SCALE) / 2, (CARD_THICKNESS * COLLECTING_CARD_START_SCALE) / 2]} friction={CARD_PHYSICS.FRICTION} restitution={CARD_PHYSICS.RESTITUTION} />
      </RigidBody>
      <group ref={groupRef} name={sceneObjectName('collecting-card', card.id)} position={initialTransform.position} rotation={initialTransform.rotation} scale={initialTransform.scale}>
        <CollectingCardMesh materials={materials} />
      </group>
      <CardTrail
        targetRef={groupRef}
        color={animationProfile.trailColor}
        length={animationProfile.trailLength}
        opacity={animationProfile.trailOpacity}
        active={animationPhase === 'flying'}
      />
      <CollectionArrivalBurst
        active={animationPhase === 'stacked'}
        position={[targetPosition[0], stackedY + 0.04, targetPosition[2]]}
        profile={animationProfile}
        seed={`${card.id}:${stackIndex}`}
      />
    </>
  );
}
