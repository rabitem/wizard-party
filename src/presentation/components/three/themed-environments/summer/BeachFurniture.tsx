'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import {
  SUMMER_COLORS,
  SUMMER_LAYOUT,
  SUMMER_LOUNGER_FABRICS,
  SUMMER_STRIPES,
  SUMMER_SURFBOARD_COLORS,
} from '@/presentation/config/summer-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createLoungerFabricGeometry, createLoungerFrameGeometry, createCanopyGeometry, UMBRELLA } from './furniture-geometry';
import { createStripeTexture, createSurfboardGeometry } from './summer-geometry';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const FINIAL_RADIUS = 0.06;
const BASE_HEIGHT = 0.08;
/** Surfboards lean back against the railing */
const SURFBOARD_LEAN = -0.22;
const SURFBOARD_WALL_OFFSET = 0.3;
/** Canvas / fabric weave and painted-metal detail (shared cached noise maps) */
const FABRIC_DETAIL = { scale: 6, normalStrength: 0.35 } as const;
const PAINT_DETAIL = { scale: 2, normalStrength: 0.15 } as const;

const LOUNGERS: PropPlacement[] = SUMMER_LAYOUT.LOUNGERS.map(([x, z, rot]) => ({ position: [x, FLOOR, z], rotationY: rot }));
const FABRICS: PropPlacement[] = LOUNGERS.map((lounger, i) => ({ ...lounger, color: SUMMER_LOUNGER_FABRICS[i % SUMMER_LOUNGER_FABRICS.length] }));
const SURFBOARDS: PropPlacement[] = SUMMER_LAYOUT.SURFBOARDS.map(([x, z], i) => ({
  position: [x - Math.sign(x) * SURFBOARD_WALL_OFFSET, FLOOR, z],
  // Positive z-rotation tips the top towards -x, so lean towards the nearer railing.
  tilt: [0, Math.sign(x) * SURFBOARD_LEAN],
  color: SUMMER_SURFBOARD_COLORS[i % SUMMER_SURFBOARD_COLORS.length],
}));

interface UmbrellaProps {
  position: [number, number, number];
  tilt: number;
  canopy: THREE.Material;
  pole: THREE.Material;
  canopyGeometry: THREE.BufferGeometry;
}

/** Beach umbrella: weighted base, slim pole, striped canopy and a finial. */
function Umbrella({ position, tilt, canopy, pole, canopyGeometry }: UmbrellaProps) {
  return (
    <group position={position}>
      <mesh position={[0, BASE_HEIGHT / 2, 0]} material={pole}>
        <cylinderGeometry args={[UMBRELLA.BASE_RADIUS, UMBRELLA.BASE_RADIUS * 1.1, BASE_HEIGHT, 12]} />
      </mesh>
      <group rotation={[tilt * 0.5, 0, tilt]}>
        <mesh position={[0, UMBRELLA.POLE_HEIGHT / 2, 0]} material={pole}>
          <cylinderGeometry args={[UMBRELLA.POLE_RADIUS, UMBRELLA.POLE_RADIUS, UMBRELLA.POLE_HEIGHT, 6]} />
        </mesh>
        <mesh geometry={canopyGeometry} material={canopy} />
        <mesh position={[0, UMBRELLA.POLE_HEIGHT + 0.08, 0]} material={pole}>
          <sphereGeometry args={[FINIAL_RADIUS, 8, 6]} />
        </mesh>
      </group>
    </group>
  );
}

/** Striped beach umbrellas over loungers, plus surfboards leaning on the railing. */
export function BeachFurniture() {
  const assets = useMemo(() => {
    const stripeMaps = SUMMER_STRIPES.map((colors) => createStripeTexture(colors));
    return {
      stripe0: stripeMaps[0],
      stripe1: stripeMaps[1],
      canopy0: addSurfaceDetail(new THREE.MeshStandardMaterial({ map: stripeMaps[0], roughness: 0.85, side: THREE.DoubleSide }), FABRIC_DETAIL),
      canopy1: addSurfaceDetail(new THREE.MeshStandardMaterial({ map: stripeMaps[1], roughness: 0.85, side: THREE.DoubleSide }), FABRIC_DETAIL),
      pole: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.umbrellaPole, roughness: 0.5 }), PAINT_DETAIL),
      frameMaterial: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.loungerFrame, roughness: 0.5 }), PAINT_DETAIL),
      fabricMaterial: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), FABRIC_DETAIL),
      boardMaterial: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.05 }),
      canopyGeometry: createCanopyGeometry(),
      frame: createLoungerFrameGeometry(),
      fabric: createLoungerFabricGeometry(),
      board: createSurfboardGeometry(),
    };
  }, []);
  useDisposables(assets);
  const canopies = [assets.canopy0, assets.canopy1];

  return (
    <group>
      {SUMMER_LAYOUT.UMBRELLAS.map(([x, z, tilt, scheme]) => (
        <Umbrella
          key={`umbrella-${x}-${z}`}
          position={[x, FLOOR, z]}
          tilt={tilt}
          canopy={canopies[scheme % canopies.length]}
          pole={assets.pole}
          canopyGeometry={assets.canopyGeometry}
        />
      ))}
      <InstancedProp geometry={assets.frame} material={assets.frameMaterial} placements={LOUNGERS} />
      <InstancedProp geometry={assets.fabric} material={assets.fabricMaterial} placements={FABRICS} />
      <InstancedProp geometry={assets.board} material={assets.boardMaterial} placements={SURFBOARDS} />
    </group>
  );
}
