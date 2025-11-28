'use client';

import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

function configureTexture(texture: THREE.Texture, repeatX: number, repeatY: number) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}

/**
 * Generate a procedural wood grain normal map
 */
function createWoodNormalMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base neutral normal
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Wood grain - wavy horizontal lines
      const grainFreq = 0.15;
      const grainPhase = Math.sin(y * grainFreq + Math.sin(x * 0.02) * 3);
      const grainDetail = Math.sin(y * grainFreq * 4 + x * 0.05) * 0.3;

      // Knot simulation (occasional circular patterns)
      const knotX = (x - size * 0.3) / size;
      const knotY = (y - size * 0.6) / size;
      const knotDist = Math.sqrt(knotX * knotX + knotY * knotY);
      const knotEffect = knotDist < 0.1 ? Math.sin(knotDist * 50) * (0.1 - knotDist) * 10 : 0;

      // Combine effects
      let nx = 128 + (grainPhase + grainDetail) * 12 + knotEffect * 15;
      let ny = 128 + Math.sin(x * 0.1 + y * 0.02) * 5 + knotEffect * 10;

      // Micro detail
      nx += Math.sin(x * 3.7 + y * 2.3) * 2;
      ny += Math.cos(x * 2.1 + y * 4.7) * 2;

      data[i] = Math.max(0, Math.min(255, nx));
      data[i + 1] = Math.max(0, Math.min(255, ny));
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  return texture;
}

/**
 * Generate leather/vinyl texture for padded rail
 */
function createLeatherNormalMap(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Leather grain pattern - small bumps
      const bumpSize = 8;
      const bumpX = (x % bumpSize) / bumpSize;
      const bumpY = (y % bumpSize) / bumpSize;

      // Rounded bump shape
      const distFromCenter = Math.sqrt(
        Math.pow(bumpX - 0.5, 2) + Math.pow(bumpY - 0.5, 2)
      );
      const bumpHeight = Math.max(0, 0.5 - distFromCenter) * 2;

      // Calculate normals from bump
      let nx = 128 + (bumpX - 0.5) * bumpHeight * 30;
      let ny = 128 + (bumpY - 0.5) * bumpHeight * 30;

      // Add micro-pore detail
      nx += Math.sin(x * 5.3 + y * 7.1) * 3;
      ny += Math.cos(x * 6.7 + y * 4.3) * 3;

      data[i] = Math.max(0, Math.min(255, nx));
      data[i + 1] = Math.max(0, Math.min(255, ny));
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 4);
  return texture;
}

export function WoodTableRim() {
  const woodTexture = useTexture(
    'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/prototype/dark/texture_01.png'
  );
  const configured = useRef(false);

  // Create procedural maps only on client side
  const woodNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createWoodNormalMap(256);
  }, []);
  const leatherNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createLeatherNormalMap(128);
  }, []);

  useEffect(() => {
    if (!configured.current) {
      configureTexture(woodTexture, 8, 2);
      configured.current = true;
    }
  }, [woodTexture]);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      woodNormalMap?.dispose();
      leatherNormalMap?.dispose();
    };
  }, [woodNormalMap, leatherNormalMap]);

  // Wood material props with optional normal map
  const woodMaterialProps = {
    map: woodTexture,
    roughness: 0.4,
    metalness: 0.05,
    color: '#a67c52',
    envMapIntensity: 0.8,
    ...(woodNormalMap && { normalMap: woodNormalMap, normalScale: new THREE.Vector2(0.2, 0.2) }),
  };

  // Leather material props with optional normal map
  const leatherMaterialProps = {
    roughness: 0.7,
    metalness: 0.0,
    ...(leatherNormalMap && { normalMap: leatherNormalMap, normalScale: new THREE.Vector2(0.3, 0.3) }),
  };

  return (
    <group>
      {/* Wooden table rim - flat ring with varnished look */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} castShadow receiveShadow>
        <ringGeometry args={[2.9, 3.35, 64]} />
        <meshStandardMaterial {...woodMaterialProps} />
      </mesh>

      {/* Outer decorative brass trim */}
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[3.28, 0.04, 12, 64]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.25}
          metalness={0.85}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Inner brass trim */}
      <mesh position={[0, 0.03, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[2.91, 0.03, 12, 64]} />
        <meshStandardMaterial
          color="#b8942a"
          roughness={0.3}
          metalness={0.8}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* Padded armrest rail - main body */}
      <mesh position={[0, 0.08, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[3.42, 0.12, 16, 64]} />
        <meshStandardMaterial color="#1a1a1a" {...leatherMaterialProps} />
      </mesh>

      {/* Padded rail - top highlight */}
      <mesh position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[3.42, 0.08, 12, 64]} />
        <meshStandardMaterial
          color="#252525"
          roughness={0.65}
          metalness={0.0}
          {...(leatherNormalMap && { normalMap: leatherNormalMap, normalScale: new THREE.Vector2(0.25, 0.25) })}
        />
      </mesh>

      {/* Stitching detail on padded rail */}
      <StitchingRing radius={3.42} y={0.14} />

      {/* Wood body - vertical support */}
      <mesh position={[0, -0.04, 0]} rotation={[0, 0, 0]} castShadow>
        <torusGeometry args={[3.3, 0.08, 8, 64]} />
        <meshStandardMaterial
          map={woodTexture}
          roughness={0.5}
          metalness={0.03}
          color="#6b4423"
          {...(woodNormalMap && { normalMap: woodNormalMap, normalScale: new THREE.Vector2(0.15, 0.15) })}
        />
      </mesh>

      {/* Table underside/shadow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <circleGeometry args={[3.6, 64]} />
        <meshStandardMaterial color="#0a0604" roughness={0.98} metalness={0.0} />
      </mesh>

      {/* Subtle table leg shadows (decorative) */}
      <TableLegShadows />
    </group>
  );
}

/**
 * Decorative stitching pattern on padded rail
 */
function StitchingRing({ radius, y }: { radius: number; y: number }) {
  const stitchCount = 48;

  return (
    <group position={[0, y, 0]}>
      {Array.from({ length: stitchCount }).map((_, i) => {
        const angle = (i / stitchCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh
            key={i}
            position={[x, 0, z]}
            rotation={[0, -angle + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.02, 0.005, 0.008]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.9} metalness={0.0} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Subtle shadow suggestion for table legs
 */
function TableLegShadows() {
  const legPositions = [
    [2.8, 0],
    [-2.8, 0],
    [0, 2.8],
    [0, -2.8],
    [2, 2],
    [-2, 2],
    [2, -2],
    [-2, -2],
  ];

  return (
    <group>
      {legPositions.map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, -0.12, z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.15, 16]} />
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
