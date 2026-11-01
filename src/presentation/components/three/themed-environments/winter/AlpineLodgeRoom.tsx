'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { WINTER_COLORS, WINTER_LAYOUT } from '@/presentation/config/winter-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createPbrMaterial,
  createPlankTexture,
  InstancedProp,
  ROOM_WALLS,
  SceneFog,
  useDisposables,
  type PropPlacement,
} from '../primitives';
import { createArchedBackWall } from './lodge-shell-geometry';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const BEAM = 0.45;
const POST = 0.55;
const RUG = { SEGMENTS: 40, BORDER: 0.28, INNER_RATIO: 0.62, LIFT: 0.006 } as const;
/** Fog pushed back so the snowy yard behind the archway reads through the haze */
const FOG = { NEAR: 18, FAR: 72 } as const;

const BEAMS: PropPlacement[] = Array.from({ length: WINTER_LAYOUT.BEAM_COUNT }, (_, i) => ({
  position: [0, FLOOR_Y + HEIGHT - BEAM / 2, -HALF_DEPTH + ((i + 0.5) * HALF_DEPTH * 2) / WINTER_LAYOUT.BEAM_COUNT],
}));
/** Ridge beam running front to back over the room centre. */
const RIDGE: PropPlacement[] = [{ position: [0, FLOOR_Y + HEIGHT - BEAM * 1.6, 0], rotationY: Math.PI / 2 }];
const POSTS: PropPlacement[] = WINTER_LAYOUT.POSTS.map(([x, z]) => ({ position: [x, FLOOR_Y + HEIGHT / 2, z] }));
/** Side and front walls (the back wall is built with the archway cut out). */
const SOLID_WALLS = ROOM_WALLS.filter((wall) => wall.id !== 'back');

/** Round woven rug under the table: border ring, field and inner medallion (woven fabric detail). */
function LodgeRug() {
  const radius = WINTER_LAYOUT.RUG_RADIUS;
  const materials = useMemo(
    () => ({
      border: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.rugBorder, roughness: 1 }), { scale: 10, normalStrength: 0.35 }),
      field: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.rug, roughness: 1 }), { scale: 10, normalStrength: 0.35 }),
      inner: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.rugInner, roughness: 1 }), { scale: 10, normalStrength: 0.35 }),
    }),
    [],
  );
  useDisposables(materials);
  return (
    <group position={[0, FLOOR_Y + RUG.LIFT, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh material={materials.border}>
        <circleGeometry args={[radius, RUG.SEGMENTS]} />
      </mesh>
      <mesh position={[0, 0, RUG.LIFT]} material={materials.field}>
        <circleGeometry args={[radius - RUG.BORDER, RUG.SEGMENTS]} />
      </mesh>
      <mesh position={[0, 0, RUG.LIFT * 2]} material={materials.border}>
        <ringGeometry args={[radius * RUG.INNER_RATIO - RUG.BORDER * 0.5, radius * RUG.INNER_RATIO, RUG.SEGMENTS]} />
      </mesh>
      <mesh position={[0, 0, RUG.LIFT * 2]} material={materials.inner}>
        <circleGeometry args={[radius * RUG.INNER_RATIO - RUG.BORDER * 0.5, RUG.SEGMENTS]} />
      </mesh>
    </group>
  );
}

/**
 * Log-cabin shell: grainy log walls (the back wall opens onto the porch),
 * a PBR plank floor, plank ceiling, heavy beams, corner posts and a rug.
 */
export function AlpineLodgeRoom() {
  const assets = useMemo(() => {
    const ceilingMap = createPlankTexture({ planks: 10, base: WINTER_COLORS.ceiling, seed: 37, repeat: [4, 4] });
    return {
      ceilingMap,
      wall: createPbrMaterial('wood', { color: WINTER_COLORS.logWall, accent: WINTER_COLORS.logWallGrain, repeat: [3, 3], seed: 13, normalScale: 0.9 }),
      floor: createPbrMaterial('wood', { color: WINTER_COLORS.floorWood, accent: WINTER_COLORS.floorGrain, repeat: [4, 12], seed: 29, normalScale: 0.7 }),
      ceiling: new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 0.95 }),
      beam: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: WINTER_COLORS.beam, roughness: 0.85 }), { scale: 3, normalStrength: 0.5 }),
      beamGeometry: new THREE.BoxGeometry(HALF_WIDTH * 2, BEAM, BEAM),
      ridgeGeometry: new THREE.BoxGeometry(HALF_DEPTH * 2, BEAM, BEAM),
      postGeometry: new THREE.CylinderGeometry(POST / 2, POST / 2, HEIGHT, 10),
      backWall: createArchedBackWall(),
      floorGeometry: new THREE.PlaneGeometry(HALF_WIDTH * 2, HALF_DEPTH * 2),
      ceilingGeometry: new THREE.PlaneGeometry(HALF_WIDTH * 2, HALF_DEPTH * 2),
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <SceneFog color={WINTER_COLORS.fog} near={FOG.NEAR} far={FOG.FAR} />
      <mesh position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={assets.floorGeometry} material={assets.floor} receiveShadow />
      <mesh position={[0, FLOOR_Y + HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={assets.ceilingGeometry} material={assets.ceiling} />
      <mesh position={[0, 0, -HALF_DEPTH]} geometry={assets.backWall} material={assets.wall} />
      {SOLID_WALLS.map((wall) => (
        <mesh key={wall.id} position={wall.position} rotation={[0, wall.rotationY, 0]} material={assets.wall}>
          <planeGeometry args={[wall.width, HEIGHT]} />
        </mesh>
      ))}
      <InstancedProp geometry={assets.beamGeometry} material={assets.beam} placements={BEAMS} />
      <InstancedProp geometry={assets.ridgeGeometry} material={assets.beam} placements={RIDGE} />
      <InstancedProp geometry={assets.postGeometry} material={assets.beam} placements={POSTS} />
      <LodgeRug />
    </group>
  );
}
