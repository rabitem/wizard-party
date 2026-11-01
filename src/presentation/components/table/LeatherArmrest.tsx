'use client';

import { LeatherStitching } from './LeatherStitching';
import { BrassStuds } from './BrassStuds';
import type { LeatherMaterialProps } from './table-visual-materials';

interface LeatherArmrestProps {
  leatherMaterialProps: LeatherMaterialProps;
}

/**
 * Leather armrest padding with stitching, brass trim, and decorative studs.
 * Wraps around the outer edge of the table rim.
 */
export function LeatherArmrest({ leatherMaterialProps }: LeatherArmrestProps) {
  return (
    <group>
      {/* Leather armrest padding */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[3.5, 0.18, 24, 64]} />
        <meshPhysicalMaterial {...leatherMaterialProps} />
      </mesh>

      {/* Leather armrest stitching - outer */}
      <LeatherStitching radius={3.65} y={0.06} />
      <LeatherStitching radius={3.35} y={0.06} />

      {/* Polished brass trim - outer */}
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.7, 0.025, 16, 64]} />
        <meshStandardMaterial
          color="#d4a84b"
          roughness={0.15}
          metalness={0.92}
        />
      </mesh>

      {/* Polished brass trim - inner */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.89, 0.02, 16, 64]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.2}
          metalness={0.88}
        />
      </mesh>

      {/* Decorative brass studs on armrest */}
      <BrassStuds count={24} radius={3.5} y={0.08} />
    </group>
  );
}
