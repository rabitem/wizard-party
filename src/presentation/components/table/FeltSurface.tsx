'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

function configureTexture(texture: THREE.Texture, repeatX: number, repeatY: number) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}

export function FeltSurface() {
  const feltTexture = useTexture(
    'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/prototype/light/texture_12.png'
  );
  const configured = useRef(false);

  useEffect(() => {
    if (!configured.current) {
      configureTexture(feltTexture, 6, 6);
      configured.current = true;
    }
  }, [feltTexture]);

  return (
    <group>
      {/* Main felt surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.88, 64]} />
        <meshStandardMaterial map={feltTexture} color="#1d6b45" roughness={0.98} metalness={0.0} />
      </mesh>

      {/* Felt edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[2.75, 2.89, 64]} />
        <meshStandardMaterial map={feltTexture} color="#145536" roughness={0.98} metalness={0.0} />
      </mesh>

      {/* Center area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <circleGeometry args={[1.2, 48]} />
        <meshStandardMaterial map={feltTexture} color="#1f7a4d" roughness={0.95} metalness={0.0} />
      </mesh>

      {/* Inner decorative ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[1.85, 1.94, 64]} />
        <meshStandardMaterial color="#d4a84b" roughness={0.25} metalness={0.85} envMapIntensity={1.2} />
      </mesh>

      {/* Outer gold line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
        <ringGeometry args={[2.68, 2.72, 64]} />
        <meshStandardMaterial color="#c9a227" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Center ring around trump area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <ringGeometry args={[0.5, 0.58, 48]} />
        <meshStandardMaterial color="#d4a84b" roughness={0.25} metalness={0.85} envMapIntensity={1.2} />
      </mesh>

      {/* Inner center circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshStandardMaterial map={feltTexture} color="#124a2d" roughness={0.98} metalness={0.0} />
      </mesh>
    </group>
  );
}
