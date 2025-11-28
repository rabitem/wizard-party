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
 * Generate a procedural fabric weave normal map
 * Creates realistic felt texture with woven pattern
 */
function createFeltNormalMap(size: number = 256): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base neutral normal (pointing up)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, size, size);

  // Create woven fabric pattern
  const weaveSize = 4;
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Woven pattern - alternating horizontal and vertical fibers
      const wx = Math.floor(x / weaveSize) % 2;
      const wy = Math.floor(y / weaveSize) % 2;
      const weavePhase = (wx + wy) % 2;

      // Fiber direction affects normal
      let nx = 128;
      let ny = 128;

      // Add micro-detail noise
      const noise = (Math.sin(x * 0.5) * Math.cos(y * 0.5) + 1) * 0.5;
      const microNoise = Math.sin(x * 2.3 + y * 1.7) * 4;

      if (weavePhase === 0) {
        // Horizontal fiber - normals point slightly left/right
        nx = 128 + Math.sin((x % weaveSize) / weaveSize * Math.PI) * 15 + microNoise;
        ny = 128 + noise * 3;
      } else {
        // Vertical fiber - normals point slightly up/down
        nx = 128 + noise * 3;
        ny = 128 + Math.sin((y % weaveSize) / weaveSize * Math.PI) * 15 + microNoise;
      }

      // Add some random fiber variation
      const fiberNoise = Math.sin(x * 7.3 + y * 11.7) * 2;
      nx += fiberNoise;
      ny += fiberNoise * 0.7;

      // Clamp to valid range
      data[i] = Math.max(0, Math.min(255, nx));
      data[i + 1] = Math.max(0, Math.min(255, ny));
      data[i + 2] = 255; // Z always pointing up primarily
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

/**
 * Generate a subtle roughness variation map
 */
function createFeltRoughnessMap(size: number = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Base high roughness with slight variation
      const baseRoughness = 240;
      const variation = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 8;
      const noise = Math.sin(x * 1.7 + y * 2.3) * 5;

      const roughness = baseRoughness + variation + noise;

      data[i] = roughness;
      data[i + 1] = roughness;
      data[i + 2] = roughness;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

export function FeltSurface() {
  const feltTexture = useTexture(
    'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/prototype/light/texture_12.png'
  );
  const configured = useRef(false);

  // Create procedural maps only on client side
  const feltNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createFeltNormalMap(256);
  }, []);
  const feltRoughnessMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createFeltRoughnessMap(128);
  }, []);

  useEffect(() => {
    if (!configured.current) {
      configureTexture(feltTexture, 6, 6);
      configured.current = true;
    }
  }, [feltTexture]);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      feltNormalMap?.dispose();
      feltRoughnessMap?.dispose();
    };
  }, [feltNormalMap, feltRoughnessMap]);

  // Shared felt material properties
  const feltMaterialProps = {
    map: feltTexture,
    ...(feltNormalMap && { normalMap: feltNormalMap, normalScale: new THREE.Vector2(0.15, 0.15) }),
    ...(feltRoughnessMap && { roughnessMap: feltRoughnessMap }),
    roughness: 0.95,
    metalness: 0.0,
  };

  return (
    <group>
      {/* Main felt surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[2.88, 64]} />
        <meshStandardMaterial {...feltMaterialProps} color="#1d6b45" />
      </mesh>

      {/* Felt edge - slightly darker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} receiveShadow>
        <ringGeometry args={[2.75, 2.89, 64]} />
        <meshStandardMaterial {...feltMaterialProps} color="#145536" />
      </mesh>

      {/* Center area - slightly brighter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]} receiveShadow>
        <circleGeometry args={[1.2, 48]} />
        <meshStandardMaterial {...feltMaterialProps} color="#1f7a4d" roughness={0.92} />
      </mesh>

      {/* Inner decorative ring - polished gold */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[1.85, 1.94, 64]} />
        <meshStandardMaterial
          color="#d4a84b"
          roughness={0.2}
          metalness={0.9}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Outer gold line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.024, 0]}>
        <ringGeometry args={[2.68, 2.72, 64]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.25}
          metalness={0.85}
          envMapIntensity={1.3}
        />
      </mesh>

      {/* Center ring around trump area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <ringGeometry args={[0.5, 0.58, 48]} />
        <meshStandardMaterial
          color="#d4a84b"
          roughness={0.2}
          metalness={0.9}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Inner center circle - darker felt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshStandardMaterial {...feltMaterialProps} color="#124a2d" />
      </mesh>

      {/* Subtle embossed pattern on center - decorative */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.023, 0]}>
        <ringGeometry args={[0.35, 0.42, 32]} />
        <meshStandardMaterial
          color="#0f3d25"
          roughness={0.99}
          metalness={0.0}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}
