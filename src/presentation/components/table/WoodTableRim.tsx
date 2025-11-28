'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

function configureTexture(texture: THREE.Texture, repeatX: number, repeatY: number) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}

export function WoodTableRim() {
  const woodTexture = useTexture(
    'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/prototype/dark/texture_01.png'
  );
  const configured = useRef(false);

  useEffect(() => {
    if (!configured.current) {
      configureTexture(woodTexture, 8, 2);
      configured.current = true;
    }
  }, [woodTexture]);

  return (
    <group>
      {/* Wooden table rim - flat ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[2.9, 3.35, 64]} />
        <meshStandardMaterial map={woodTexture} roughness={0.75} metalness={0.0} color="#a67c52" />
      </mesh>

      {/* Outer edge torus */}
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[3.18, 0.07, 16, 64]} />
        <meshStandardMaterial map={woodTexture} roughness={0.65} metalness={0.05} color="#8b6914" />
      </mesh>

      {/* Inner lip torus */}
      <mesh position={[0, 0.04, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.92, 0.05, 12, 64]} />
        <meshStandardMaterial map={woodTexture} roughness={0.7} metalness={0.05} color="#6b4423" />
      </mesh>

      {/* Table underside/shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[3.4, 64]} />
        <meshStandardMaterial color="#1a0f08" roughness={0.95} metalness={0.0} />
      </mesh>
    </group>
  );
}
