'use client';

interface PlayerSeatProps {
  position: [number, number, number];
  isCurrentTurn: boolean;
  isDealer: boolean;
}

export function PlayerSeat({ position, isCurrentTurn, isDealer }: PlayerSeatProps) {
  return (
    <group position={position}>
      {/* Seat base */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.04, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>

      {/* Turn indicator */}
      {isCurrentTurn && (
        <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.15, 0.3, 16]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Dealer chip */}
      {isDealer && (
        <mesh position={[0.28, -0.04, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.015, 8]} />
          <meshBasicMaterial color="#d4a84b" />
        </mesh>
      )}
    </group>
  );
}
