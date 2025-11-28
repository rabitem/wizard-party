'use client';

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ICard } from '@shared/domain';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_THICKNESS,
  createCardMaterials,
  disposeCardMaterials,
} from '../utils/card-texture';
import { CardTrail } from './three/CardTrail';
import {
  PLAY_ANIMATION,
  easeOutCubic,
  easeInOutCubic,
  randomInRange,
} from '../config/physics.config';

interface AnimatedPlayedCardProps {
  card: ICard;
  targetPosition: [number, number, number];
  targetRotation: [number, number, number];
  startPosition: [number, number, number];
  scale?: number;
  isLocalPlayer?: boolean;
  cardId: string;
}

// Seeded random number generator for consistent randomness per card
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return () => {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

// Box-Muller transform for normal distribution
function gaussianRandom(rand: () => number, mean: number, stdDev: number): number {
  const u1 = rand();
  const u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

export function AnimatedPlayedCard({
  card,
  targetPosition,
  targetRotation,
  startPosition,
  scale = 0.9,
  isLocalPlayer = false,
  cardId,
}: AnimatedPlayedCardProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const animationStartTime = useRef<number | null>(null);
  const lastCardId = useRef<string>('');

  // Animation timing from config
  const ANIMATION_DURATION = isLocalPlayer
    ? PLAY_ANIMATION.LOCAL_DURATION
    : PLAY_ANIMATION.OPPONENT_DURATION;

  // Generate consistent random offsets for this specific card
  const randomOffsets = useMemo(() => {
    const rand = seededRandom(cardId);
    return {
      posX: gaussianRandom(rand, 0, 0.15),
      posZ: gaussianRandom(rand, 0, 0.15),
      posY: rand() * 0.03,
      finalRotZ: gaussianRandom(rand, 0, 0.35),
      finalRotX: gaussianRandom(rand, 0, 0.05),
      flightSpinZ: (rand() - 0.5) * Math.PI * 2,
      flightWobbleX: (rand() - 0.5) * 0.4,
      flightWobbleZ: (rand() - 0.5) * 0.3,
      wobbleFreq: 2 + rand() * 3,
      throwStrength: 0.7 + rand() * 0.6,
      gravityMult: 0.9 + rand() * 0.2,
      bounceStrength: 0.1 + rand() * 0.15,
      durationMult: 0.85 + rand() * 0.3,
    };
  }, [cardId]);

  // Reset animation when card changes - useEffect is appropriate here
  // since we're synchronizing with an external prop change
  useEffect(() => {
    if (cardId !== lastCardId.current) {
      lastCardId.current = cardId;
      animationStartTime.current = null;
    }
  }, [cardId]);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (animationStartTime.current === null) {
      animationStartTime.current = state.clock.elapsedTime;
    }

    const adjustedDuration = ANIMATION_DURATION * randomOffsets.durationMult;
    const elapsed = state.clock.elapsedTime - animationStartTime.current;
    const rawProgress = Math.min(elapsed / adjustedDuration, 1);

    const posProgress = easeOutCubic(rawProgress);

    // Calculate flip progress using config values
    let flipProgress = 0;
    if (!isLocalPlayer) {
      if (rawProgress > PLAY_ANIMATION.FLIP_START && rawProgress < PLAY_ANIMATION.FLIP_END) {
        flipProgress = easeInOutCubic(
          (rawProgress - PLAY_ANIMATION.FLIP_START) /
          (PLAY_ANIMATION.FLIP_END - PLAY_ANIMATION.FLIP_START)
        );
      } else if (rawProgress >= PLAY_ANIMATION.FLIP_END) {
        flipProgress = 1;
      }
    } else {
      flipProgress = 1;
    }

    // Physics-based arc using config values
    const baseArcHeight = isLocalPlayer
      ? PLAY_ANIMATION.PEAK_HEIGHT_LOCAL
      : PLAY_ANIMATION.PEAK_HEIGHT_OPPONENT;
    const peakHeight = baseArcHeight * randomOffsets.throwStrength;
    const peakTime = PLAY_ANIMATION.PEAK_TIME;
    const normalizedTime = rawProgress / peakTime;
    let arcY: number;
    if (rawProgress < peakTime) {
      arcY = peakHeight * (1 - Math.pow(1 - normalizedTime, 2));
    } else {
      const fallTime = (rawProgress - peakTime) / (1 - peakTime);
      const gravityFall = Math.pow(fallTime, 1.8) * randomOffsets.gravityMult;
      arcY = peakHeight * (1 - gravityFall);
    }

    // Impact bounce with damped oscillation for realistic landing
    let bounceY = 0;
    let bounceRotZ = 0;
    if (rawProgress > 0.8) {
      const bounceProgress = (rawProgress - 0.8) / 0.2;
      // Primary bounce using config values
      const primaryBounce = Math.sin(bounceProgress * Math.PI * PLAY_ANIMATION.BOUNCE_FREQUENCY / 6) *
        PLAY_ANIMATION.BOUNCE_INTENSITY * randomOffsets.bounceStrength * 4;
      // Decay envelope using config
      const decay = Math.exp(-bounceProgress * PLAY_ANIMATION.BOUNCE_DECAY);
      bounceY = primaryBounce * decay;
      // Subtle rotation wobble on landing
      bounceRotZ = Math.sin(bounceProgress * Math.PI * 3) * PLAY_ANIMATION.BOUNCE_INTENSITY * decay;
    }

    // Final position with random offsets
    const finalPosX = targetPosition[0] + randomOffsets.posX;
    const finalPosY = targetPosition[1] + randomOffsets.posY;
    const finalPosZ = targetPosition[2] + randomOffsets.posZ;

    const currentPos = new THREE.Vector3(
      THREE.MathUtils.lerp(startPosition[0], finalPosX, posProgress),
      THREE.MathUtils.lerp(startPosition[1], finalPosY, posProgress) + Math.max(arcY, 0) + bounceY,
      THREE.MathUtils.lerp(startPosition[2], finalPosZ, posProgress)
    );

    groupRef.current.position.copy(currentPos);
    groupRef.current.rotation.order = 'YXZ';

    const flipAmount = isLocalPlayer ? 0 : Math.PI * (1 - flipProgress);

    // In-flight wobble using config values
    const wobbleDecay = 1 - easeOutCubic(rawProgress);
    const timeOffset = state.clock.elapsedTime * PLAY_ANIMATION.FLIGHT_WOBBLE_SPEED;
    const wobbleX = Math.sin(timeOffset) * PLAY_ANIMATION.FLIGHT_WOBBLE_INTENSITY * randomOffsets.flightWobbleX * wobbleDecay;
    const wobbleZ = Math.cos(timeOffset * 1.3) * PLAY_ANIMATION.FLIGHT_WOBBLE_INTENSITY * randomOffsets.flightWobbleZ * wobbleDecay;

    // In-flight spin using config values
    const spinDecay = 1 - easeOutCubic(rawProgress);
    const flightSpin = randomOffsets.flightSpinZ * PLAY_ANIMATION.FLIGHT_SPIN_SPEED * spinDecay;

    const finalRotX = targetRotation[0] + randomOffsets.finalRotX;
    const finalRotZ = randomOffsets.finalRotZ;

    groupRef.current.rotation.set(
      finalRotX + flipAmount + wobbleX,
      THREE.MathUtils.lerp(0, targetRotation[1], posProgress),
      finalRotZ + flightSpin + wobbleZ + bounceRotZ
    );

    // Scale animation
    const scaleProgress = easeOutCubic(Math.min(rawProgress * 1.5, 1));
    const currentScale = THREE.MathUtils.lerp(0.6, scale, scaleProgress);
    groupRef.current.scale.setScalar(currentScale);
  });

  // Set up materials
  useEffect(() => {
    if (!meshRef.current) return;

    const materials = createCardMaterials(card);
    meshRef.current.material = materials;

    return () => {
      disposeCardMaterials(materials);
    };
  }, [card]);

  return (
    <>
      {/* Card trail effect during flight - always active, component handles visibility */}
      <CardTrail
        targetRef={groupRef}
        color="#ffd700"
        length={10}
        opacity={0.2}
        active={true}
      />

      <group ref={groupRef} position={startPosition}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_THICKNESS]} />
        </mesh>
      </group>
    </>
  );
}
