'use client';

import { memo } from 'react';
import { ContactShadows } from '@react-three/drei';
import {
  TABLE_GROUND_SHADOW,
  createTableContactShadowProps,
} from './table-visual-materials';

interface GroundShadowProps {
  radius?: number;
  y?: number;
  opacity?: number;
}

const CONTACT_SHADOW_PROPS = createTableContactShadowProps();

/**
 * Ground shadow mesh displayed beneath the table.
 * Creates a subtle shadow effect on the ground plane.
 */
function GroundShadowMeshes({
  radius = 4.2,
  y = -0.75,
  opacity = TABLE_GROUND_SHADOW.DISC_OPACITY,
}: GroundShadowProps) {
  return (
    <group>
      <ContactShadows
        position={[0, y + 0.03, 0]}
        {...CONTACT_SHADOW_PROPS}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial
          color={TABLE_GROUND_SHADOW.COLOR}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Memoized: ContactShadows counts its baked `frames` in a render-local variable, so every
 * re-render (the rim re-renders on each game-state update) would bake the whole scene again.
 */
export const GroundShadow = memo(GroundShadowMeshes);
