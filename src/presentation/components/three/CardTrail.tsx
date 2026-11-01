'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARD_TRAIL } from '../../config/collection-animation.config';
import {
  advanceCardTrailHistory,
  createCardTrailHistory,
  resetCardTrailHistory,
} from './card-trail-history';
import { SoftPointsMaterial } from './particles/SoftPointsMaterial';

interface CardTrailProps {
  targetRef: React.RefObject<THREE.Group | null>;
  color?: string;
  length?: number;
  opacity?: number;
  active?: boolean;
}

/**
 * Creates a ghostly trail effect behind a moving card
 */
export function CardTrail({
  targetRef,
  color = '#ffd700',
  length = CARD_TRAIL.DEFAULT_LENGTH,
  opacity = 0.3,
  active = true,
}: CardTrailProps) {
  const trailRef = useRef<THREE.Points>(null);
  const wasActiveRef = useRef(false);

  // Sample ring sized from the current length; its buffer is the geometry's position attribute
  const history = useMemo(() => createCardTrailHistory(length), [length]);

  useFrame((state) => {
    if (!active) {
      wasActiveRef.current = false;
      return;
    }
    if (!trailRef.current || !targetRef.current) return;

    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
      resetCardTrailHistory(history);
    }

    if (!advanceCardTrailHistory(history, state.clock.elapsedTime, targetRef.current.position)) return;

    const geometry = trailRef.current.geometry;
    geometry.attributes.position.needsUpdate = true;
    // Draw only recorded samples, never the unfilled tail of the buffer
    geometry.setDrawRange(0, history.filled);
  });

  if (!active) return null;

  return (
    // The trail moves every frame, so a cached bounding sphere would cull it wrongly
    <points ref={trailRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[history.positions, 3]}
        />
      </bufferGeometry>
      <SoftPointsMaterial
        color={color}
        size={0.05}
        opacity={opacity}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
