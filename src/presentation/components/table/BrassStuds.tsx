'use client';

import { InstancedRingPart } from './InstancedRingPart';

const FLAT_ON_TABLE: [number, number, number] = [-Math.PI / 2, 0, 0];
const BASE_RING_OFFSET: [number, number, number] = [0, -0.005, 0];

interface BrassStudsProps {
  count: number;
  radius: number;
  y: number;
}

/**
 * Decorative brass studs on the leather armrest (one instanced draw per stud part)
 */
export function BrassStuds({ count, radius, y }: BrassStudsProps) {
  const layout = { count, radius, y };

  return (
    <group>
      {/* Stud dome */}
      <InstancedRingPart layout={layout}>
        <sphereGeometry args={[0.025, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#d4a84b"
          roughness={0.2}
          metalness={0.9}
          envMapIntensity={1.5}
        />
      </InstancedRingPart>
      {/* Stud base ring */}
      <InstancedRingPart layout={layout} position={BASE_RING_OFFSET} rotation={FLAT_ON_TABLE}>
        <ringGeometry args={[0.02, 0.028, 12]} />
        <meshStandardMaterial
          color="#a67c52"
          roughness={0.3}
          metalness={0.85}
        />
      </InstancedRingPart>
    </group>
  );
}
