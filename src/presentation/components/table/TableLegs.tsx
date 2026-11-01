'use client';

import { StaticBatch } from '../three/batching';

// Pre-compute leg positions for stable keys
const LEG_POSITIONS = [
  { id: 'leg-0', angle: 0 },
  { id: 'leg-1', angle: Math.PI / 3 },
  { id: 'leg-2', angle: (2 * Math.PI) / 3 },
  { id: 'leg-3', angle: Math.PI },
  { id: 'leg-4', angle: (4 * Math.PI) / 3 },
  { id: 'leg-5', angle: (5 * Math.PI) / 3 },
];

/**
 * Elegant curved table legs, drawn as one merged mesh per material. They sit under the table top,
 * so they cast no shadow map shadows; their floor contact is the baked GroundShadow plus the
 * dark discs below each foot.
 */
export function TableLegs() {
  const legRadius = 3.4;

  return (
    <StaticBatch>
      {LEG_POSITIONS.map((leg) => {
        const x = Math.cos(leg.angle) * legRadius;
        const z = Math.sin(leg.angle) * legRadius;

        return (
          <group key={leg.id} position={[x, -0.12, z]} rotation={[0, -leg.angle, 0]}>
            {/* Main leg column */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.06, 0.08, 0.5, 12]} />
              <meshStandardMaterial
                color="#5a3d25"
                roughness={0.35}
                metalness={0.05}
              />
            </mesh>

            {/* Decorative top bracket */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.12, 0.08, 0.04, 12]} />
              <meshStandardMaterial
                color="#6b4423"
                roughness={0.3}
                metalness={0.05}
              />
            </mesh>

            {/* Brass accent ring */}
            <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.065, 0.01, 8, 24]} />
              <meshStandardMaterial
                color="#c9a227"
                roughness={0.25}
                metalness={0.88}
              />
            </mesh>

            {/* Foot pad */}
            <mesh position={[0, -0.52, 0]}>
              <cylinderGeometry args={[0.1, 0.12, 0.04, 12]} />
              <meshStandardMaterial
                color="#3d2010"
                roughness={0.4}
                metalness={0.05}
              />
            </mesh>

            {/* Brass foot cap */}
            <mesh position={[0, -0.55, 0]}>
              <cylinderGeometry args={[0.08, 0.1, 0.02, 12]} />
              <meshStandardMaterial
                color="#b8942a"
                roughness={0.25}
                metalness={0.85}
              />
            </mesh>

            {/* Leg shadow on floor */}
            <mesh position={[0, -0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.18, 16]} />
              <meshBasicMaterial
                color="#120d08"
                transparent
                opacity={0.24}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Center pedestal */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.15, 0.25, 0.45, 16]} />
        <meshStandardMaterial
          color="#5a3d25"
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Pedestal brass band */}
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.015, 8, 32]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Pedestal base */}
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.06, 24]} />
        <meshStandardMaterial
          color="#4a2511"
          roughness={0.4}
          metalness={0.05}
        />
      </mesh>
    </StaticBatch>
  );
}
