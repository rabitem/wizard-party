'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { AVATAR_PRESETS } from '../SettingsPanel';

// Build emote emoji map from avatar presets for consistent theming
const EMOTE_EMOJIS: Record<string, string> = Object.fromEntries(
  AVATAR_PRESETS.map((avatar) => [avatar.id, avatar.emoji])
);

interface PlayerEmoteProps {
  position: [number, number, number];
  emoteId: string;
  playerName: string;
}

export function PlayerEmote({ position, emoteId, playerName }: PlayerEmoteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [startTime] = useState(() => Date.now());
  const emoji = EMOTE_EMOJIS[emoteId] || '❓';

  useFrame(() => {
    if (groupRef.current) {
      const elapsed = (Date.now() - startTime) / 1000;
      groupRef.current.position.y = position[1] + Math.sin(elapsed * 3) * 0.03;
      const fadeProgress = Math.min(elapsed / 3, 1);
      const scale = 1 - fadeProgress * 0.3;
      groupRef.current.scale.setScalar(Math.max(0.7, scale));
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard>
        <mesh position={[0, 0, -0.05]}>
          <circleGeometry args={[0.25, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.6} />
        </mesh>

        <Text fontSize={0.35} anchorX="center" anchorY="middle">
          {emoji}
        </Text>

        <Text
          position={[0, -0.28, 0]}
          fontSize={0.08}
          color="#ffd700"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {playerName}
        </Text>
      </Billboard>
    </group>
  );
}
