'use client';

import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { useDisposables } from '@/presentation/components/three/themed-environments/primitives/useDisposables';
import { SURFACE_LAYER_Y, SURFACE_LAYOUT } from './surface.config';
import { getSurfaceGeometries } from './surface-geometry';

interface Disposable {
  dispose: () => void;
}

/** Materials for each visual layer; omitted layers are not drawn. */
export interface SurfaceLayers {
  /** Play disc (radius 2.88) */
  base: THREE.Material;
  /** Edge band 2.75 - 2.89 */
  edge?: THREE.Material;
  /** Centre circle */
  center?: THREE.Material;
  /** Transparent full-disc overlay (cobwebs, frost, constellations, screentone) */
  decal?: THREE.Material;
  innerRing?: THREE.Material;
  outerRing?: THREE.Material;
  /** Painted over the wood rim ring */
  rim?: THREE.Material;
  /** Covers the brass inner trim + inner wood molding */
  lipCap?: THREE.Material;
  /** Covers the outer wood molding */
  outerCap?: THREE.Material;
  /** Covers the leather armrest */
  armrestCap?: THREE.Material;
}

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Builds theme assets once per palette and disposes them when the theme
 * changes or the surface unmounts. `factory` must be a stable module function.
 */
export function useSurfaceAssets<T extends Record<string, Disposable>>(
  factory: (palette: TableThemePalette) => T,
  palette: TableThemePalette,
): T {
  const assets = useMemo(() => factory(palette), [factory, palette]);
  useDisposables(assets);
  return assets;
}

/** Lifts an overlay material above coplanar geometry and stops it writing depth. */
export function asOverlay<M extends THREE.Material>(material: M, transparent = false): M {
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  if (transparent) {
    material.transparent = true;
    material.depthWrite = false;
  }
  return material;
}

/** Polished metal inlay rings in the palette accent colours (as on the classic felt). */
export function createAccentRings(palette: TableThemePalette): {
  innerRing: THREE.MeshStandardMaterial;
  outerRing: THREE.MeshStandardMaterial;
} {
  return {
    innerRing: asOverlay(
      new THREE.MeshStandardMaterial({ color: palette.accent.innerRing, roughness: 0.2, metalness: 0.9 }),
    ),
    outerRing: asOverlay(
      new THREE.MeshStandardMaterial({ color: palette.accent.outerRing, roughness: 0.25, metalness: 0.85 }),
    ),
  };
}

/** One flat (rotated) mesh; skipped when the layer has no material. */
function FlatLayer({ geometry, material, y }: { geometry: THREE.BufferGeometry; material?: THREE.Material; y: number }) {
  if (!material) return null;
  return <mesh geometry={geometry} material={material} rotation={FLAT} position={[0, y, 0]} receiveShadow />;
}

/**
 * Generic themed table surface: the same flat layers as the classic felt
 * (disc, edge band, centre, inlay rings) plus optional decal, rim overlay and
 * caps that restyle the wood rim. Nothing here has a collider.
 */
export function LayeredSurface({ layers, children }: { layers: SurfaceLayers; children?: ReactNode }) {
  const g = getSurfaceGeometries();
  const L = SURFACE_LAYOUT;
  const Y = SURFACE_LAYER_Y;
  return (
    <group>
      <FlatLayer geometry={g.disc} material={layers.base} y={Y.BASE} />
      <FlatLayer geometry={g.edge} material={layers.edge} y={Y.EDGE} />
      <FlatLayer geometry={g.disc} material={layers.decal} y={Y.DECAL} />
      <FlatLayer geometry={g.center} material={layers.center} y={Y.CENTER} />
      <FlatLayer geometry={g.innerRing} material={layers.innerRing} y={Y.INNER_RING} />
      <FlatLayer geometry={g.outerRing} material={layers.outerRing} y={Y.OUTER_RING} />
      <FlatLayer geometry={g.rim} material={layers.rim} y={L.RIM_OVERLAY_Y} />
      <FlatLayer geometry={g.lipCap} material={layers.lipCap} y={L.LIP_CAP.y} />
      <FlatLayer geometry={g.outerCap} material={layers.outerCap} y={L.OUTER_CAP.y} />
      <FlatLayer geometry={g.armrestCap} material={layers.armrestCap} y={L.ARMREST_CAP.y} />
      {children}
    </group>
  );
}
