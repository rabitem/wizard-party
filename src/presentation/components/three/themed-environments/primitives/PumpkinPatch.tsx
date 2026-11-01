'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp } from './InstancedProp';
import { localMatrix, type PropPlacement } from './instancing';
import { getJackFaceGeometry, getPumpkinGeometry, getStemGeometry, PUMPKIN_SHAPE } from './pumpkin-geometry';
import { createFlameMaterial, createGlowMaterial } from './glow';
import { useFlicker } from './useFlicker';
import { useDisposables } from './useDisposables';
import { GlowSprites } from './GlowSprites';

export interface PumpkinPlacement extends PropPlacement {
  /** Carved jack-o'-lantern with a flickering face */
  carved?: boolean;
}

interface PumpkinPatchProps {
  pumpkins: readonly PumpkinPlacement[];
  skinColor?: string;
  stemColor?: string;
  faceColor?: string;
  glowColor?: string;
  /** Base opacity of the carved-face glow */
  glowStrength?: number;
}

const STEM_OFFSET = localMatrix([0, PUMPKIN_SHAPE.HEIGHT * 0.94, 0]);
const GLOW_SCALE = 1.7;
const GLOW_FORWARD = PUMPKIN_SHAPE.RADIUS + 0.12;

function uniformScale(scale: PropPlacement['scale']): number {
  if (scale === undefined) return 1;
  return typeof scale === 'number' ? scale : scale[0];
}

/** World position just in front of a carved pumpkin's face. */
function glowPosition(p: PumpkinPlacement): Vec3 {
  const s = uniformScale(p.scale);
  const rotation = p.rotationY ?? 0;
  const forward = GLOW_FORWARD * s;
  return [
    p.position[0] + Math.sin(rotation) * forward,
    p.position[1] + (PUMPKIN_SHAPE.HEIGHT / 2) * s,
    p.position[2] + Math.cos(rotation) * forward,
  ];
}

/**
 * Instanced pumpkins and gourds: one draw call for skins, one for stems and
 * one for carved faces, plus additive halos in front of jack-o'-lanterns.
 */
export function PumpkinPatch({
  pumpkins,
  skinColor = '#e06a12',
  stemColor = '#4a5a22',
  faceColor = '#ffb347',
  glowColor = '#ff8a1f',
  glowStrength = 0.75,
}: PumpkinPatchProps) {
  const materials = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.02 }),
      stem: new THREE.MeshStandardMaterial({ color: stemColor, roughness: 0.9 }),
      face: createFlameMaterial(faceColor),
      glow: createGlowMaterial(glowColor, glowStrength),
    }),
    [stemColor, faceColor, glowColor, glowStrength],
  );
  useDisposables(materials);

  const tinted = useMemo(
    () => pumpkins.map((p) => ({ ...p, color: p.color ?? skinColor })),
    [pumpkins, skinColor],
  );
  const carved = useMemo(() => tinted.filter((p) => p.carved), [tinted]);
  const glowPoints = useMemo(
    () => carved.map((p) => ({ position: glowPosition(p), scale: GLOW_SCALE * uniformScale(p.scale) })),
    [carved],
  );

  const flickerTargets = useMemo(
    () => [
      { material: materials.face, base: 0.95, amplitude: 0.08, useOpacity: true },
      { material: materials.glow, base: glowStrength, amplitude: 0.22, phase: 1.3, useOpacity: true },
    ],
    [materials, glowStrength],
  );
  useFlicker(flickerTargets);

  return (
    <group>
      <InstancedProp geometry={getPumpkinGeometry()} material={materials.skin} placements={tinted} />
      <InstancedProp geometry={getStemGeometry()} material={materials.stem} placements={tinted} offset={STEM_OFFSET} />
      <InstancedProp geometry={getJackFaceGeometry()} material={materials.face} placements={carved} />
      <GlowSprites points={glowPoints} material={materials.glow} />
    </group>
  );
}
