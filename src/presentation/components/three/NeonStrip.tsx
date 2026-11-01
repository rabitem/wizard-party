'use client';

/**
 * Creates a neon tube light strip - no point light for performance
 */
export function NeonStrip({
  position,
  rotation = [0, 0, 0],
  length = 4,
  color = '#ff00ff',
  thickness = 0.03,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  length?: number;
  color?: string;
  thickness?: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <capsuleGeometry args={[thickness, length, 4, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}
