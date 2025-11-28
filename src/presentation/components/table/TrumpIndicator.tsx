'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Suit, SUIT_COLORS, SUIT_SYMBOLS } from '@shared/domain';

interface TrumpIndicatorProps {
  suit: Suit | null;
}

export function TrumpIndicator({ suit }: TrumpIndicatorProps) {
  const groupRef = useRef<THREE.Group>(null);
  const suitColor = suit ? SUIT_COLORS[suit] : '#8855ff';
  const suitSymbol = suit ? SUIT_SYMBOLS[suit] : '★';

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.35, 0]}>
      <Billboard>
        <Text
          fontSize={0.38}
          color={suitColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="#000000"
        >
          {suitSymbol}
        </Text>
      </Billboard>
    </group>
  );
}
