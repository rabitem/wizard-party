'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { PIXEL_CABINET as CAB, PIXEL_CABINETS, PIXEL_REALISM, PIXEL_SCREENS } from '@/presentation/config/pixel-environment.config';
import { InstancedProp, localMatrix, useDisposables, type PropPlacement } from '../primitives';
import { createReflectionGeometry } from './pixel-screens';

const { REFLECTION } = PIXEL_REALISM;
const FADE_HEIGHT = 64;

/** Placement offset: flat on the floor, starting just in front of the cabinet base. */
const REFLECTION_OFFSET = localMatrix([0, REFLECTION.LIFT, CAB.DEPTH / 2 + REFLECTION.GAP + REFLECTION.LENGTH / 2], [-Math.PI / 2, 0, 0]);

const GROUPS = Array.from({ length: PIXEL_SCREENS.VARIANTS }, (_, variant) => ({
  id: `reflection-${variant}`,
  variant,
  placements: PIXEL_CABINETS.filter((c) => c.variant === variant).map(({ position, rotationY }): PropPlacement => ({ position, rotationY })),
}));

/** Alpha ramp (green channel): opaque next to the cabinet (v = 0), gone at the far end. */
function createFadeTexture(): THREE.Texture {
  if (typeof document === 'undefined') return new THREE.Texture();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = FADE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Canvas top is v = 1 (far end)
    const gradient = ctx.createLinearGradient(0, 0, 0, FADE_HEIGHT);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.6, '#3a3a3a');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1, FADE_HEIGHT);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * Glossy-floor reflections of the cabinet screens: one stretched, softly
 * filtered copy of each screen's live atlas tile per cabinet, fading away
 * from the cabinet (additive, one draw call per mini game). They animate
 * with the screens for free since they sample the same canvas.
 */
export function CabinetReflections({ texture }: { texture: THREE.Texture }) {
  const assets = useMemo(() => {
    const fade = createFadeTexture();
    return {
      fade,
      material: new THREE.MeshBasicMaterial({
        map: texture,
        alphaMap: fade,
        transparent: true,
        opacity: REFLECTION.OPACITY,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [texture]);
  const geometries = useMemo(
    () => Object.fromEntries(GROUPS.map(({ id, variant }) => [id, createReflectionGeometry(variant, REFLECTION.WIDTH, REFLECTION.LENGTH)])),
    [],
  );
  useDisposables(assets);
  useDisposables(geometries);

  return (
    <group>
      {GROUPS.map(({ id, placements }) => (
        <InstancedProp key={id} geometry={geometries[id]} material={assets.material} placements={placements} offset={REFLECTION_OFFSET} />
      ))}
    </group>
  );
}
