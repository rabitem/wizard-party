'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp } from './InstancedProp';
import type { PropPlacement } from './instancing';
import { createFlameMaterial, createGlowMaterial } from './glow';
import { useFlicker } from './useFlicker';
import { useDisposables } from './useDisposables';
import { GlowSprites } from './GlowSprites';

export interface CandlePlacement {
  position: Vec3;
  /** Overall size */
  scale?: number;
  /** Height multiplier for the wax body (melted stubs vs tall tapers) */
  height?: number;
  color?: string;
}

interface CandleClusterProps {
  candles: readonly CandlePlacement[];
  waxColor?: string;
  flameColor?: string;
  glowColor?: string;
  glowStrength?: number;
}

const CANDLE = {
  RADIUS: 0.05,
  HEIGHT: 0.22,
  FLAME_RADIUS: 0.028,
  FLAME_STRETCH: 2.2,
  GLOW_SCALE: 0.55,
} as const;

let bodyGeometry: THREE.BufferGeometry | null = null;
let flameGeometry: THREE.BufferGeometry | null = null;

function getBodyGeometry() {
  if (!bodyGeometry) {
    bodyGeometry = new THREE.CylinderGeometry(CANDLE.RADIUS * 0.92, CANDLE.RADIUS, CANDLE.HEIGHT, 10);
    bodyGeometry.translate(0, CANDLE.HEIGHT / 2, 0);
  }
  return bodyGeometry;
}

function getFlameGeometry() {
  if (!flameGeometry) {
    flameGeometry = new THREE.SphereGeometry(CANDLE.FLAME_RADIUS, 8, 6);
    flameGeometry.scale(1, CANDLE.FLAME_STRETCH, 1);
    flameGeometry.translate(0, CANDLE.FLAME_RADIUS * CANDLE.FLAME_STRETCH, 0);
  }
  return flameGeometry;
}

/** Instanced candles: wax bodies, additive flames and halos, all flickering together. */
export function CandleCluster({
  candles,
  waxColor = '#efe2c4',
  flameColor = '#ffd27a',
  glowColor = '#ff9a3c',
  glowStrength = 0.6,
}: CandleClusterProps) {
  const materials = useMemo(
    () => ({
      wax: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, emissive: '#3a2410', emissiveIntensity: 0.4 }),
      flame: createFlameMaterial(flameColor),
      glow: createGlowMaterial(glowColor, glowStrength),
    }),
    [flameColor, glowColor, glowStrength],
  );
  useDisposables(materials);

  const { bodies, flames, glows } = useMemo(() => {
    const bodyList: PropPlacement[] = [];
    const flameList: PropPlacement[] = [];
    const glowList = candles.map((candle) => {
      const scale = candle.scale ?? 1;
      const height = candle.height ?? 1;
      const [x, y, z] = candle.position;
      const top = y + CANDLE.HEIGHT * height * scale;
      bodyList.push({ position: candle.position, scale: [scale, scale * height, scale], color: candle.color ?? waxColor });
      flameList.push({ position: [x, top + 0.01 * scale, z], scale });
      return { position: [x, top + CANDLE.FLAME_RADIUS * 2 * scale, z] as Vec3, scale: CANDLE.GLOW_SCALE * scale };
    });
    return { bodies: bodyList, flames: flameList, glows: glowList };
  }, [candles, waxColor]);

  const flickerTargets = useMemo(
    () => [
      { material: materials.flame, base: 0.95, amplitude: 0.1, useOpacity: true },
      { material: materials.glow, base: glowStrength, amplitude: 0.3, phase: 2.1, useOpacity: true },
    ],
    [materials, glowStrength],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <InstancedProp geometry={getBodyGeometry()} material={materials.wax} placements={bodies} />
      <InstancedProp geometry={getFlameGeometry()} material={materials.flame} placements={flames} />
      <GlowSprites points={glows} material={materials.glow} />
    </group>
  );
}
