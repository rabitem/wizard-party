'use client';

import type * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';

export interface GlowPoint {
  position: Vec3;
  scale: number;
}

interface GlowSpritesProps {
  points: readonly GlowPoint[];
  material: THREE.SpriteMaterial;
}

/** Camera-facing additive halos sharing one material (so one flicker drives all). */
export function GlowSprites({ points, material }: GlowSpritesProps) {
  return (
    <group>
      {points.map((point) => (
        <sprite
          key={point.position.join(',')}
          position={point.position}
          scale={[point.scale, point.scale, point.scale]}
          material={material}
        />
      ))}
    </group>
  );
}
