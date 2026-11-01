'use client';

/**
 * Color themes for different slot machine variants
 */
const SLOT_MACHINE_THEMES = [
  { primary: '#8B0000', secondary: '#FFD700', accent: '#ff3366' },
  { primary: '#1a1a8B', secondary: '#00FFFF', accent: '#00aaff' },
  { primary: '#2d5a27', secondary: '#FFD700', accent: '#44ff44' },
  { primary: '#4a1a4a', secondary: '#FF69B4', accent: '#ff66ff' },
];

/** Top light bulb positions and colors */
const TOP_LIGHTS = [
  { id: 'light-1', x: -0.3, color: '#ff0000' },
  { id: 'light-2', x: -0.1, color: '#ffff00' },
  { id: 'light-3', x: 0.1, color: '#00ff00' },
  { id: 'light-4', x: 0.3, color: '#ff00ff' },
];

/**
 * Optimized slot machine - static geometry, no per-machine lights or animations
 */
export function SlotMachine({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  variant = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  variant?: number;
}) {
  const theme = SLOT_MACHINE_THEMES[variant % SLOT_MACHINE_THEMES.length];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Base */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.1, 0.1, 0.85]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Main cabinet */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1, 1.5, 0.75]} />
        <meshStandardMaterial color={theme.primary} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Side panels */}
      <mesh position={[-0.52, 0.85, 0]}>
        <boxGeometry args={[0.04, 1.4, 0.7]} />
        <meshStandardMaterial color={theme.secondary} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.52, 0.85, 0]}>
        <boxGeometry args={[0.04, 1.4, 0.7]} />
        <meshStandardMaterial color={theme.secondary} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Reel window - glowing screen effect */}
      <mesh position={[0, 1.0, 0.39]}>
        <boxGeometry args={[0.7, 0.45, 0.02]} />
        <meshBasicMaterial color={theme.accent} toneMapped={false} />
      </mesh>

      {/* Reel symbols - static colored bars */}
      <mesh position={[-0.2, 1.0, 0.41]}>
        <boxGeometry args={[0.15, 0.35, 0.01]} />
        <meshBasicMaterial color="#ff3333" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.0, 0.41]}>
        <boxGeometry args={[0.15, 0.35, 0.01]} />
        <meshBasicMaterial color="#ffcc00" toneMapped={false} />
      </mesh>
      <mesh position={[0.2, 1.0, 0.41]}>
        <boxGeometry args={[0.15, 0.35, 0.01]} />
        <meshBasicMaterial color="#33ff33" toneMapped={false} />
      </mesh>

      {/* Credit display */}
      <mesh position={[0, 0.5, 0.39]}>
        <boxGeometry args={[0.5, 0.12, 0.02]} />
        <meshBasicMaterial color="#00ff00" toneMapped={false} />
      </mesh>

      {/* Buttons */}
      <mesh position={[0.2, 0.3, 0.4]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 8]} />
        <meshBasicMaterial color="#ff0000" toneMapped={false} />
      </mesh>
      <mesh position={[-0.2, 0.3, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.03, 8]} />
        <meshBasicMaterial color="#00ff00" toneMapped={false} />
      </mesh>

      {/* Lever */}
      <mesh position={[0.55, 1.0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0.55, 1.28, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ff0000" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Top crown */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[1.05, 0.2, 0.8]} />
        <meshStandardMaterial color={theme.primary} metalness={0.3} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <boxGeometry args={[0.9, 0.1, 0.7]} />
        <meshStandardMaterial color={theme.secondary} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Top lights - static glowing spheres, no point lights */}
      {TOP_LIGHTS.map((light) => (
        <mesh key={light.id} position={[light.x, 1.78, 0.4]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color={light.color} toneMapped={false} />
        </mesh>
      ))}

      {/* Coin tray */}
      <mesh position={[0, 0.15, 0.5]}>
        <boxGeometry args={[0.6, 0.08, 0.15]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}
