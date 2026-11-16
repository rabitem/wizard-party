'use client';

import { memo } from 'react';
import { BakedContactShadow } from './BakedContactShadow';
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
      <BakedContactShadow
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

/** Keep the baked-shadow resource owner stable across game-state updates. */
export const GroundShadow = memo(GroundShadowMeshes);
