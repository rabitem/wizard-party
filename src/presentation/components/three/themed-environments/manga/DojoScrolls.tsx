'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MANGA_COLORS, MANGA_SCROLL_SIZE, MANGA_SCROLLS } from '@/presentation/config/manga-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createToonMaterial } from './manga-geometry';
import { createScrollTexture } from './manga-textures';

const VARIANTS = 3;
const ROD = { RADIUS: 0.035, OVERHANG: 0.18, GAP: 0.03, STANDOFF: 0.04 } as const;
const [SCROLL_W, SCROLL_H] = MANGA_SCROLL_SIZE;

/** Top and bottom rods (jiku) lying horizontally along each scroll. */
const RODS: PropPlacement[] = MANGA_SCROLLS.flatMap(({ position, rotationY }) => {
  const [x, y, z] = position;
  const nx = Math.sin(rotationY) * ROD.STANDOFF;
  const nz = Math.cos(rotationY) * ROD.STANDOFF;
  return [1, -1].map((side) => ({
    position: [x + nx, y + side * (SCROLL_H / 2 + ROD.GAP), z + nz] as Vec3,
    rotationY,
    tilt: [0, Math.PI / 2] as [number, number],
    scale: [1, SCROLL_W + ROD.OVERHANG * (side < 0 ? 1 : 0.4), 1] as Vec3,
  }));
});

/** Hanging kakejiku scrolls: enso circles, ink calligraphy and ink bamboo. */
export function DojoScrolls() {
  const assets = useMemo(() => {
    const maps = Array.from({ length: VARIANTS }, (_, i) => createScrollTexture(i));
    return {
      plane: new THREE.PlaneGeometry(SCROLL_W, SCROLL_H),
      rod: new THREE.CylinderGeometry(ROD.RADIUS, ROD.RADIUS, 1, 8),
      rodMaterial: createToonMaterial(MANGA_COLORS.lacquer),
      maps,
      arts: maps.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.9 })),
    };
  }, []);
  const disposables = useMemo(() => {
    const { plane, rod, rodMaterial, maps, arts } = assets;
    const perVariant = [...maps, ...arts].map((resource, i) => [`variant${i}`, resource] as const);
    return { plane, rod, rodMaterial, ...Object.fromEntries(perVariant) };
  }, [assets]);
  useDisposables(disposables);

  return (
    <group>
      {MANGA_SCROLLS.map(({ position, rotationY, variant }) => (
        <mesh
          key={position.join(',')}
          geometry={assets.plane}
          material={assets.arts[variant % VARIANTS]}
          position={position}
          rotation={[0, rotationY, 0]}
        />
      ))}
      <InstancedProp geometry={assets.rod} material={assets.rodMaterial} placements={RODS} />
    </group>
  );
}
