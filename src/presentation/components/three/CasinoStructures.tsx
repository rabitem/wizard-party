'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NeonStrip } from './NeonStrip';

/**
 * Casino wall segment - simplified
 */
export function CasinoWall({
  position,
  rotation,
  width = 20,
  height = 10,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width?: number;
  height?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main wall */}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#0a0a15" metalness={0.1} roughness={0.9} />
      </mesh>

      {/* Single bottom neon strip */}
      <NeonStrip
        position={[0, -height / 2 + 0.5, 0.2]}
        rotation={[0, 0, Math.PI / 2]}
        length={width - 2}
        color="#ff00aa"
        thickness={0.025}
      />
    </group>
  );
}

/**
 * Casino floor with diamond pattern
 */
export function CasinoFloor() {
  const floorTexture = useMemo(() => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Dark base
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, 512, 512);

    // Diamond pattern
    const tileSize = 64;
    for (let y = 0; y < 512; y += tileSize) {
      for (let x = 0; x < 512; x += tileSize) {
        const isAlternate = ((x / tileSize) + (y / tileSize)) % 2 === 0;

        ctx.fillStyle = isAlternate ? '#0f0f1a' : '#080810';
        ctx.beginPath();
        ctx.moveTo(x + tileSize / 2, y);
        ctx.lineTo(x + tileSize, y + tileSize / 2);
        ctx.lineTo(x + tileSize / 2, y + tileSize);
        ctx.lineTo(x, y + tileSize / 2);
        ctx.closePath();
        ctx.fill();

        // Gold accent lines
        ctx.strokeStyle = '#3d2f1f';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.51, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial
        map={floorTexture}
        color="#1a1a25"
        roughness={0.7}
        metalness={0.3}
      />
    </mesh>
  );
}

/**
 * Simple ceiling - no lights for performance
 */
export function CasinoCeiling() {
  return (
    <group position={[0, 12, 0]}>
      {/* Main ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0a0a10" roughness={0.9} />
      </mesh>

      {/* Decorative light fixtures - static, no actual lights */}
      {[
        { id: 'light-nw', x: -6, z: -6 },
        { id: 'light-ne', x: 6, z: -6 },
        { id: 'light-se', x: 6, z: 6 },
        { id: 'light-sw', x: -6, z: 6 },
      ].map((light) => (
        <mesh key={light.id} position={[light.x, -0.1, light.z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.3, 0.15, 8]} />
          <meshBasicMaterial color="#332244" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
