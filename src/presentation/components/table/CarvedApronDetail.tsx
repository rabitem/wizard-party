'use client';

import { InstancedRingPart } from './InstancedRingPart';
import type { RingLayout } from './ring-instances';

const SEGMENT_LAYOUT: RingLayout = { count: 12, radius: 3.72, y: -0.06, faceOutward: true };
const DIAMOND_ROTATION: [number, number, number] = [0, 0, Math.PI / 4];
const INLAY_OFFSET: [number, number, number] = [0, 0, 0.001];

/**
 * Carved decorative inlay on the table apron (one instanced draw per inlay part)
 */
export function CarvedApronDetail() {
  return (
    <group>
      {/* Carved diamond pattern */}
      <InstancedRingPart layout={SEGMENT_LAYOUT} rotation={DIAMOND_ROTATION}>
        <planeGeometry args={[0.08, 0.08]} />
        <meshStandardMaterial
          color="#3d2415"
          roughness={0.7}
          metalness={0.0}
        />
      </InstancedRingPart>
      {/* Gold inlay line */}
      <InstancedRingPart layout={SEGMENT_LAYOUT} position={INLAY_OFFSET}>
        <planeGeometry args={[0.12, 0.01]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.25}
          metalness={0.85}
          emissive="#c9a227"
          emissiveIntensity={0.1}
        />
      </InstancedRingPart>
    </group>
  );
}
