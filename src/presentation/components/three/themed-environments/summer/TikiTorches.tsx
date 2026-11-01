'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SUMMER_COLORS, SUMMER_LAYOUT, SUMMER_TORCH_FIRE } from '@/presentation/config/summer-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createGlowMaterial,
  GlowSprites,
  InstancedProp,
  localMatrix,
  useDisposables,
  useFlicker,
  type GlowPoint,
  type PropPlacement,
} from '../primitives';
import { createTikiHeadGeometry, createTikiPoleGeometry, TIKI } from './furniture-geometry';
import { TorchEmbers, TorchFlames } from './TorchFire';

const GLOW_SCALE = 1.5;
const GLOW_OPACITY = 0.5;
const FLAME_TOP = TIKI.HEIGHT + TIKI.HEAD_HEIGHT;
const FLAME_HEIGHT = SUMMER_TORCH_FIRE.FLAME_SIZE[1];

const TORCHES: PropPlacement[] = SUMMER_LAYOUT.TIKI_TORCHES.map(([x, z], i) => ({
  position: [x, ENVIRONMENT_ROOM.FLOOR_Y, z],
  rotationY: i * 0.9,
}));
/** Flame base sits slightly inside the woven head */
const FLAME_OFFSET = localMatrix([0, FLAME_TOP - 0.04, 0]);
const GLOWS: GlowPoint[] = TORCHES.map((torch) => ({
  position: [torch.position[0], torch.position[1] + FLAME_TOP + FLAME_HEIGHT * 0.4, torch.position[2]] as Vec3,
  scale: GLOW_SCALE,
}));
const EMBER_ORIGINS: Vec3[] = TORCHES.map((torch) => [torch.position[0], torch.position[1] + FLAME_TOP + FLAME_HEIGHT * 0.55, torch.position[2]]);

/**
 * Bamboo tiki torches around the deck edge: noise-shaped billboard flames,
 * rising embers, a flickering halo and one warm shadowless light between the
 * back torches (bloom picks up the bright flame cores).
 */
export function TikiTorches() {
  const lightRef = useRef<THREE.PointLight>(null);
  const assets = useMemo(
    () => ({
      pole: createTikiPoleGeometry(),
      head: createTikiHeadGeometry(),
      bamboo: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.bamboo, roughness: 0.55 }), { scale: 2, normalStrength: 0.35 }),
      headMaterial: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.torchHead, roughness: 1 }), { scale: 3, normalStrength: 0.8 }),
      glow: createGlowMaterial(SUMMER_COLORS.torchGlow, GLOW_OPACITY),
    }),
    [],
  );
  useDisposables(assets);

  const { LIGHT } = SUMMER_TORCH_FIRE;
  const flickerTargets = useMemo(
    () => [
      { material: assets.glow, base: GLOW_OPACITY, amplitude: 0.3, phase: 1.7, useOpacity: true },
      { light: lightRef, base: LIGHT.intensity, amplitude: 0.18, phase: 0.4 },
    ],
    [assets, LIGHT.intensity],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <InstancedProp geometry={assets.pole} material={assets.bamboo} placements={TORCHES} />
      <InstancedProp geometry={assets.head} material={assets.headMaterial} placements={TORCHES} />
      <TorchFlames placements={TORCHES} offset={FLAME_OFFSET} />
      <TorchEmbers origins={EMBER_ORIGINS} />
      <GlowSprites points={GLOWS} material={assets.glow} />
      <pointLight ref={lightRef} position={LIGHT.position} color={LIGHT.color} intensity={LIGHT.intensity} distance={LIGHT.distance} decay={2} />
    </group>
  );
}
