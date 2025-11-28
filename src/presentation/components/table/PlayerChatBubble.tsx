'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

interface PlayerChatBubbleProps {
  position: [number, number, number];
  message: string;
  playerName: string;
}

export function PlayerChatBubble({ position, message, playerName }: PlayerChatBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => Date.now());

  useFrame(() => {
    if (groupRef.current) {
      const elapsed = (Date.now() - startTime) / 1000;
      groupRef.current.position.y = position[1] + Math.sin(elapsed * 2) * 0.02;
      const fadeProgress = Math.min(elapsed / 3, 1);
      const scale = 1 - fadeProgress * 0.3;
      groupRef.current.scale.setScalar(Math.max(0.7, scale));
    }
  });

  const displayMessage = message.length > 20 ? message.slice(0, 18) + '...' : message;

  return (
    <group ref={groupRef} position={position}>
      <Billboard>
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[0.38, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.15} />
        </mesh>

        <mesh position={[0, 0, -0.02]}>
          <ringGeometry args={[0.32, 0.35, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.4} />
        </mesh>

        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[0.32, 32]} />
          <meshBasicMaterial color="#15152a" />
        </mesh>

        <Text
          position={[0, 0.03, 0]}
          fontSize={0.07}
          color="#fef3c7"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.55}
          textAlign="center"
        >
          {displayMessage}
        </Text>

        <Text
          position={[0, -0.12, 0]}
          fontSize={0.05}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {playerName}
        </Text>
      </Billboard>
    </group>
  );
}
