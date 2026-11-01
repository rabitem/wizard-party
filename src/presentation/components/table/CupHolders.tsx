'use client';

import { InstancedRingPart } from './InstancedRingPart';

const HOLDER_RING_RADIUS = 3.15;
const FLAT_ON_TABLE: [number, number, number] = [-Math.PI / 2, 0, 0];
const DEPRESSION_OFFSET: [number, number, number] = [0, -0.01, 0];
const LINER_OFFSET: [number, number, number] = [0, -0.02, 0];
const BRASS_RING_OFFSET: [number, number, number] = [0, 0.005, 0];

interface CupHoldersProps {
  count: number;
}

/**
 * Cup holders carved into the wood rim (one instanced draw per holder part)
 */
export function CupHolders({ count }: CupHoldersProps) {
  // Holders sit between the seats: half a slot ahead of the first seat angle
  const layout = { count, radius: HOLDER_RING_RADIUS, y: 0, angleOffset: Math.PI / count };

  return (
    <group>
      {/* Cup holder depression */}
      <InstancedRingPart layout={layout} position={DEPRESSION_OFFSET} rotation={FLAT_ON_TABLE}>
        <cylinderGeometry args={[0.12, 0.1, 0.03, 24]} />
        <meshStandardMaterial
          color="#3d2010"
          roughness={0.8}
          metalness={0.0}
        />
      </InstancedRingPart>
      {/* Cork/felt liner */}
      <InstancedRingPart layout={layout} position={LINER_OFFSET} rotation={FLAT_ON_TABLE}>
        <circleGeometry args={[0.095, 24]} />
        <meshStandardMaterial
          color="#8b7355"
          roughness={0.95}
          metalness={0.0}
        />
      </InstancedRingPart>
      {/* Brass ring around holder */}
      <InstancedRingPart layout={layout} position={BRASS_RING_OFFSET} rotation={FLAT_ON_TABLE}>
        <torusGeometry args={[0.115, 0.008, 8, 24]} />
        <meshStandardMaterial
          color="#b8942a"
          roughness={0.3}
          metalness={0.85}
        />
      </InstancedRingPart>
    </group>
  );
}
