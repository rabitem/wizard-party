'use client';

import { InstancedRingPart } from './InstancedRingPart';

const STITCH_COUNT = 72;
const FLAT_ON_TABLE: [number, number, number] = [-Math.PI / 2, 0, 0];

interface LeatherStitchingProps {
  radius: number;
  y: number;
}

/**
 * Leather stitching detail - small dots simulating thread (one instanced draw)
 */
export function LeatherStitching({ radius, y }: LeatherStitchingProps) {
  return (
    <InstancedRingPart layout={{ count: STITCH_COUNT, radius, y }} rotation={FLAT_ON_TABLE}>
      <circleGeometry args={[0.008, 6]} />
      <meshStandardMaterial
        color="#d4a84b"
        roughness={0.3}
        metalness={0.6}
      />
    </InstancedRingPart>
  );
}
