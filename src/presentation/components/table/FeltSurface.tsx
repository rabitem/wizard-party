'use client';

import { lazy, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useSelectedTableTheme, type TableThemePalette } from './table-theme';
import { TABLE_TEXTURE_URLS } from '@/presentation/config/assets.config';
import { getThemeFx } from '@/presentation/config/theme-fx.config';
import { InstancedRingPart } from './InstancedRingPart';
import { AMBIENT_USER_DATA } from '../three/frame-scheduling/ambient';

/** Seasonal/trend surfaces load on demand; the surrounding Suspense shows the felt fallback meanwhile. */
const ThemedTableSurface = lazy(() =>
  import('./surfaces/ThemedTableSurface').then((module) => ({ default: module.ThemedTableSurface })),
);

const FELT_TEXTURE_REPEAT = 6;

/**
 * Tiles the felt texture. Runs from useTexture's onLoad, i.e. before drei uploads the texture, so
 * the wrap mode is part of the one upload. The loader caches the texture across remounts: once it
 * is configured, nothing is flagged again (a needsUpdate would re-upload the 1024² image).
 */
function configureFeltTexture(texture: THREE.Texture | THREE.Texture[]) {
  for (const entry of Array.isArray(texture) ? texture : [texture]) {
    entry.repeat.set(FELT_TEXTURE_REPEAT, FELT_TEXTURE_REPEAT);
    if (entry.wrapS === THREE.RepeatWrapping && entry.wrapT === THREE.RepeatWrapping) continue;
    entry.wrapS = entry.wrapT = THREE.RepeatWrapping;
    entry.needsUpdate = true;
  }
}

/**
 * Generate a procedural fabric weave normal map
 * Creates realistic felt texture with woven pattern
 */
function createFeltNormalMap(size: number = 256): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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
function createFeltRoughnessMap(size: number = 128): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

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

/**
 * Table play surface: the classic felt for 'felt' tables, otherwise the themed
 * surface from theme-fx.config. Visual only - the physics collider never changes.
 */
export function FeltSurface() {
  const tableTheme = useSelectedTableTheme();
  const { surface } = getThemeFx(tableTheme.id);
  if (surface === 'felt') return <ClassicFeltSurface tableTheme={tableTheme} />;
  // Themed surfaces carry looping decor (pool floaties, pulsing runes): ambient motion that
  // animates at the idle frame rate instead of keeping the table at full rate
  return (
    <group userData={AMBIENT_USER_DATA}>
      <ThemedTableSurface surface={surface} palette={tableTheme} />
    </group>
  );
}

/** The original felt (unchanged look). */
function ClassicFeltSurface({ tableTheme }: { tableTheme: TableThemePalette }) {
  const feltTexture = useTexture(TABLE_TEXTURE_URLS.FELT, configureFeltTexture);

  // Create procedural maps only on client side
  const feltNormalMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createFeltNormalMap(256);
  }, []);
  const feltRoughnessMap = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return createFeltRoughnessMap(128);
  }, []);

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
      {/* Main felt surface - base layer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[2.88, 64]} />
        <meshStandardMaterial {...feltMaterialProps} color={tableTheme.felt.base} />
      </mesh>

      {/* Felt edge - slightly darker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, 0]} receiveShadow>
        <ringGeometry args={[2.75, 2.89, 64]} />
        <meshStandardMaterial {...feltMaterialProps} color={tableTheme.felt.edge} />
      </mesh>

      {/* Stitching around the felt edge */}
      <FeltStitching radius={2.85} y={0.03} color={tableTheme.felt.stitch} />

      {/* Inner decorative ring - polished gold */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[1.85, 1.94, 64]} />
        <meshStandardMaterial
          color={tableTheme.accent.innerRing}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Outer gold line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <ringGeometry args={[2.68, 2.72, 64]} />
        <meshStandardMaterial
          color={tableTheme.accent.outerRing}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>

      {/* Inner center circle - darker felt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
        <circleGeometry args={[0.48, 32]} />
        <meshStandardMaterial {...feltMaterialProps} color={tableTheme.felt.center} />
      </mesh>
    </group>
  );
}

const STITCH_COUNT = 60;
const STITCH_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Stitching along the felt edge: 60 dashes, each tangent to the seam, in one instanced draw.
 */
function FeltStitching({ radius, y, color }: { radius: number; y: number; color: string }) {
  return (
    <InstancedRingPart
      layout={{ count: STITCH_COUNT, radius, y, angleOffset: Math.PI / STITCH_COUNT, faceOutward: true }}
      rotation={STITCH_ROTATION}
    >
      <planeGeometry args={[0.025, 0.006]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.0} />
    </InstancedRingPart>
  );
}
