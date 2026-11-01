'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SOLARPUNK_COLORS, SOLARPUNK_GREENHOUSE, SOLARPUNK_OUTSIDE, SOLARPUNK_SKY, SOLARPUNK_SWAY } from '@/presentation/config/solarpunk-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, createPbrMaterial, InstancedProp, RoomShell, ROOM_WALLS, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { addFoliageSway, useSwayClock } from './foliage-sway';
import { createGlassMaterial } from './glass-material';
import { createSkyTexture } from './solarpunk-textures';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const G = SOLARPUNK_GREENHOUSE;
const LEDGE_BUSH_SPACING = 1.15;
/** The front wall sits behind the camera: no ledge planting there */
const PLANTED_WALLS = new Set(['back', 'left', 'right']);
const SKY_SEGMENTS: [number, number] = [32, 16];

interface WallFrame {
  along: Vec3;
  inward: Vec3;
  center: Vec3;
  width: number;
  rotationY: number;
  id: string;
}

const WALL_FRAMES: WallFrame[] = ROOM_WALLS.map((wall) => ({
  id: wall.id,
  width: wall.width,
  rotationY: wall.rotationY,
  center: wall.position,
  along: [Math.cos(wall.rotationY), 0, -Math.sin(wall.rotationY)],
  inward: [Math.sin(wall.rotationY), 0, Math.cos(wall.rotationY)],
}));

function wallPoint(frame: WallFrame, along: number, y: number, inset: number): Vec3 {
  return [
    frame.center[0] + frame.along[0] * along + frame.inward[0] * inset,
    y,
    frame.center[2] + frame.along[2] * along + frame.inward[2] * inset,
  ];
}

/** Birch knee wall the glazing stands on. */
const KNEE_WALLS: PropPlacement[] = WALL_FRAMES.map((frame) => ({
  position: wallPoint(frame, 0, FLOOR_Y + G.KNEE_HEIGHT / 2, G.KNEE_DEPTH / 2),
  scale: [frame.width, G.KNEE_HEIGHT, G.KNEE_DEPTH],
  rotationY: frame.rotationY,
}));

/** White vertical mullions from the knee wall to the roof. */
const MULLIONS: PropPlacement[] = WALL_FRAMES.flatMap((frame) => {
  const count = Math.floor(frame.width / G.MULLION_SPACING);
  const span = HEIGHT - G.KNEE_HEIGHT;
  return Array.from({ length: count + 1 }, (_, i) => ({
    position: wallPoint(frame, -frame.width / 2 + (i * frame.width) / count, FLOOR_Y + G.KNEE_HEIGHT + span / 2, 0.06),
    scale: [G.MULLION_SIZE, span, G.MULLION_SIZE] as Vec3,
    rotationY: frame.rotationY,
  }));
});

/** Horizontal transoms across every wall. */
const TRANSOMS: PropPlacement[] = WALL_FRAMES.flatMap((frame) =>
  G.TRANSOMS.map((height) => ({
    position: wallPoint(frame, 0, FLOOR_Y + height, 0.06),
    scale: [frame.width, G.MULLION_SIZE, G.MULLION_SIZE * 1.4] as Vec3,
    rotationY: frame.rotationY,
  })),
);

/** Roof ribs left to right plus two long purlins front to back. */
const ROOF_RIBS: PropPlacement[] = [
  ...Array.from({ length: Math.floor((HALF_DEPTH * 2) / G.ROOF_RIB_SPACING) + 1 }, (_, i) => ({
    position: [0, G.CEILING_Y - G.ROOF_RIB_SIZE / 2, -HALF_DEPTH + i * G.ROOF_RIB_SPACING] as Vec3,
    scale: [HALF_WIDTH * 2, G.ROOF_RIB_SIZE, G.ROOF_RIB_SIZE] as Vec3,
  })),
  ...[-HALF_WIDTH / 3, HALF_WIDTH / 3].map((x) => ({
    position: [x, G.CEILING_Y - G.ROOF_RIB_SIZE, 0] as Vec3,
    scale: [G.ROOF_RIB_SIZE * 1.4, G.ROOF_RIB_SIZE * 1.4, HALF_DEPTH * 2] as Vec3,
  })),
];

/** Little shrubs planted along the top of the knee wall. */
const LEDGE_BUSHES: PropPlacement[] = (() => {
  const rand = seededRandom(19);
  const greens = [SOLARPUNK_COLORS.leaf, SOLARPUNK_COLORS.leafLight, SOLARPUNK_COLORS.leafDeep];
  return WALL_FRAMES.filter((frame) => PLANTED_WALLS.has(frame.id)).flatMap((frame) => {
    const count = Math.floor(frame.width / LEDGE_BUSH_SPACING);
    return Array.from({ length: count }, (_, i) => ({
      position: wallPoint(frame, -frame.width / 2 + (i + 0.5) * LEDGE_BUSH_SPACING, FLOOR_Y + G.KNEE_HEIGHT + 0.08, G.KNEE_DEPTH / 2),
      scale: [0.32 + rand() * 0.12, 0.22 + rand() * 0.16, 0.2] as Vec3,
      rotationY: frame.rotationY,
      color: greens[Math.floor(rand() * greens.length)],
    }));
  });
})();

/** Clover tufts (some flowering) dotted along the moss ring. */
const MOSS_TUFTS: PropPlacement[] = (() => {
  const rand = seededRandom(23);
  const { inner, outer, tufts } = G.MOSS_RING;
  const tints = [SOLARPUNK_COLORS.leafLight, SOLARPUNK_COLORS.leaf, '#ffffff', '#ffd84a'];
  return Array.from({ length: tufts }, (_, i) => {
    const angle = (i / tufts) * Math.PI * 2 + rand() * 0.15;
    const radius = inner + (outer - inner) * (0.25 + rand() * 0.5);
    return {
      position: [Math.cos(angle) * radius, FLOOR_Y + 0.03, Math.sin(angle) * radius] as Vec3,
      scale: [0.12 + rand() * 0.06, 0.06 + rand() * 0.04, 0.12 + rand() * 0.06] as Vec3,
      color: tints[i % 3 === 0 ? 2 + (i % 2) : Math.floor(rand() * 2)],
    };
  });
})();
const MOSS_SEGMENTS = 64;

/**
 * Greenhouse shell: PBR tiled floor, fresnel glass walls and roof in
 * white frames over a birch knee wall (ledge shrubs sway gently), a moss
 * inlay ring around the table, a sky dome with meadow hills and the meadow
 * outside.
 */
export function GreenhouseAtrium() {
  const { assets, sway } = useMemo(() => {
    const skyMap = createSkyTexture();
    const bush = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });
    const bushSway = addFoliageSway(bush, SOLARPUNK_SWAY.bushes);
    const resources = {
      skyMap,
      // Procedural PBR tiles (cached textures): colour, roughness and grout normals.
      floor: createPbrMaterial('stone', { color: SOLARPUNK_COLORS.tile, accent: SOLARPUNK_COLORS.grout, repeat: G.FLOOR_TILE_REPEAT, roughness: 0.75, normalScale: 0.45 }),
      glass: createGlassMaterial({ color: SOLARPUNK_COLORS.glass, opacity: G.GLASS_OPACITY }),
      roofGlass: createGlassMaterial({ color: SOLARPUNK_COLORS.glass, opacity: G.GLASS_OPACITY * 0.7 }),
      sky: new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.BackSide, fog: false, toneMapped: false }),
      meadow: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.meadow, roughness: 1 }), { scale: 24, normalStrength: 0.4 }),
      frame: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.frame, roughness: 0.4 }), { scale: 2, normalStrength: 0.08 }),
      birch: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.birch, roughness: 0.65 }), { scale: 6, normalStrength: 0.2 }),
      bush,
      box: new THREE.BoxGeometry(1, 1, 1),
      blob: new THREE.IcosahedronGeometry(1, 1),
      dome: new THREE.SphereGeometry(SOLARPUNK_SKY.radius, SKY_SEGMENTS[0], SKY_SEGMENTS[1]),
      ground: new THREE.PlaneGeometry(SOLARPUNK_OUTSIDE.MEADOW_SIZE, SOLARPUNK_OUTSIDE.MEADOW_SIZE),
      mossRing: new THREE.RingGeometry(G.MOSS_RING.inner, G.MOSS_RING.outer, MOSS_SEGMENTS),
      brassRing: new THREE.RingGeometry(G.MOSS_RING.inner - 0.06, G.MOSS_RING.inner, MOSS_SEGMENTS),
      moss: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.moss, roughness: 1 }), { scale: 8, normalStrength: 0.5 }),
      brass: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SOLARPUNK_COLORS.brass, roughness: 0.35, metalness: 0.7 }), { scale: 4, normalStrength: 0.1 }),
    };
    return { assets: resources, sway: [bushSway] };
  }, []);
  useSwayClock(sway);
  useDisposables(assets);

  return (
    <group>
      <mesh geometry={assets.dome} material={assets.sky} position={[0, FLOOR_Y, 0]} />
      <mesh geometry={assets.ground} material={assets.meadow} position={[0, FLOOR_Y - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <RoomShell
        fogColor={SOLARPUNK_COLORS.fog}
        floorColor={SOLARPUNK_COLORS.tile}
        wallColor={SOLARPUNK_COLORS.glass}
        ceilingColor={SOLARPUNK_COLORS.glass}
        floorMaterial={assets.floor}
        wallMaterial={assets.glass}
        ceilingMaterial={assets.roofGlass}
        fogNear={20}
        fogFar={62}
      >
        <InstancedProp geometry={assets.box} material={assets.birch} placements={KNEE_WALLS} />
        <InstancedProp geometry={assets.box} material={assets.frame} placements={MULLIONS} />
        <InstancedProp geometry={assets.box} material={assets.frame} placements={TRANSOMS} />
        <InstancedProp geometry={assets.box} material={assets.frame} placements={ROOF_RIBS} />
        <InstancedProp geometry={assets.blob} material={assets.bush} placements={LEDGE_BUSHES} />
        <mesh geometry={assets.mossRing} material={assets.moss} position={[0, FLOOR_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh geometry={assets.brassRing} material={assets.brass} position={[0, FLOOR_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <InstancedProp geometry={assets.blob} material={assets.bush} placements={MOSS_TUFTS} />
      </RoomShell>
    </group>
  );
}
