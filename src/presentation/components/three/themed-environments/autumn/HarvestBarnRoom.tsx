'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { AUTUMN_COLORS, AUTUMN_LAYOUT, AUTUMN_WINDOW_VIEW } from '@/presentation/config/autumn-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createGlowMeshMaterial,
  createPbrMaterial,
  createPlankTexture,
  InstancedProp,
  RoomShell,
  useDisposables,
  WindowSnowView,
  type PropPlacement,
} from '../primitives';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const BEAM = 0.4;
const POST = 0.45;
const BRACE_LENGTH = 2.2;
const WINDOW_FRAME = 0.16;

const RAFTERS: PropPlacement[] = Array.from({ length: AUTUMN_LAYOUT.RAFTER_COUNT }, (_, i) => ({
  position: [0, FLOOR_Y + HEIGHT - BEAM / 2, -HALF_DEPTH + ((i + 0.5) * HALF_DEPTH * 2) / AUTUMN_LAYOUT.RAFTER_COUNT],
}));
/** Two long purlins running front to back, tying the rafters together. */
const PURLINS: PropPlacement[] = [-6, 6].map((x) => ({
  position: [x, FLOOR_Y + HEIGHT - BEAM * 1.5, 0],
  rotationY: Math.PI / 2,
}));
const POSTS: PropPlacement[] = AUTUMN_LAYOUT.POSTS.map(([x, z]) => ({ position: [x, FLOOR_Y + HEIGHT / 2, z] }));
/** Diagonal knee braces from each post up to the purlin above it (along z). */
const BRACES: PropPlacement[] = AUTUMN_LAYOUT.POSTS.flatMap(([x, z]) =>
  [-1, 1].map((side) => ({
    position: [x, FLOOR_Y + HEIGHT - 1.5, z + side * 0.75] as [number, number, number],
    tilt: [-side * (Math.PI / 4), 0] as [number, number],
  })),
);

function useBarnMaterials() {
  const materials = useMemo(() => {
    const wallMap = createPlankTexture({ planks: 8, base: AUTUMN_COLORS.wallWood, seed: 11, repeat: [6, 2], vertical: true });
    const ceilingMap = createPlankTexture({ planks: 10, base: AUTUMN_COLORS.ceiling, seed: 31, repeat: [4, 4] });
    return {
      wallMap,
      ceilingMap,
      wall: addSurfaceDetail(new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.85 }), { scale: 6, normalStrength: 0.45 }),
      floor: createPbrMaterial('wood', { color: AUTUMN_COLORS.floorWood, accent: AUTUMN_COLORS.floorGrain, repeat: [4, 12], seed: 23, normalScale: 0.7 }),
      ceiling: addSurfaceDetail(new THREE.MeshStandardMaterial({ map: ceilingMap, roughness: 0.95 }), { scale: 4, normalStrength: 0.35 }),
      beam: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: AUTUMN_COLORS.beam, roughness: 0.8 }), { scale: 3, normalStrength: 0.55 }),
      halo: createGlowMeshMaterial(AUTUMN_COLORS.sunset, 0.22),
    };
  }, []);
  useDisposables(materials);
  return materials;
}

function useBarnGeometries() {
  const geometries = useMemo(
    () => ({
      rafter: new THREE.BoxGeometry(HALF_WIDTH * 2, BEAM, BEAM),
      purlin: new THREE.BoxGeometry(HALF_DEPTH * 2, BEAM * 0.8, BEAM * 0.8),
      post: new THREE.BoxGeometry(POST, HEIGHT, POST),
      brace: new THREE.BoxGeometry(BEAM * 0.6, BEAM * 0.6, BRACE_LENGTH),
    }),
    [],
  );
  useDisposables(geometries);
  return geometries;
}

const WINDOW_BARS: ReadonlyArray<{ id: string; position: Vec3; size: Vec3 }> = (() => {
  const [width, height] = AUTUMN_LAYOUT.WINDOW_SIZE;
  return [
    { id: 'top', position: [0, height / 2, 0.06], size: [width + WINDOW_FRAME * 2, WINDOW_FRAME, 0.12] },
    { id: 'bottom', position: [0, -height / 2, 0.1], size: [width + WINDOW_FRAME * 3, WINDOW_FRAME, 0.3] },
    { id: 'left', position: [-width / 2, 0, 0.06], size: [WINDOW_FRAME, height, 0.12] },
    { id: 'right', position: [width / 2, 0, 0.06], size: [WINDOW_FRAME, height, 0.12] },
    { id: 'mid-v', position: [0, 0, 0.05], size: [WINDOW_FRAME * 0.6, height, 0.08] },
    { id: 'mid-h', position: [0, 0, 0.05], size: [width, WINDOW_FRAME * 0.6, 0.08] },
  ];
})();

/**
 * Back-wall barn window onto a low sun over golden fields and turning woods
 * (ray-cast view with parallax), a soft sunlit halo on the wall and the
 * timber frame with cross mullions.
 */
function SunsetWindow({ frame, halo }: { frame: THREE.Material; halo: THREE.Material }) {
  const [width, height] = AUTUMN_LAYOUT.WINDOW_SIZE;
  return (
    <group position={AUTUMN_LAYOUT.WINDOW_CENTER}>
      <WindowSnowView position={[0, 0, 0.01]} size={AUTUMN_LAYOUT.WINDOW_SIZE} variant="dusk" palette={AUTUMN_WINDOW_VIEW} precipitation="none" frost={0.12} sillDrift={0} />
      <mesh position={[0, 0, 0.005]} scale={[width * 1.7, height * 2, 1]} material={halo}>
        <planeGeometry />
      </mesh>
      {WINDOW_BARS.map((bar) => (
        <mesh key={bar.id} position={bar.position} material={frame}>
          <boxGeometry args={bar.size} />
        </mesh>
      ))}
    </group>
  );
}

/** Timber barn shell: plank walls, PBR plank floor, rafters, purlins, posts with knee braces, sunset window. */
export function HarvestBarnRoom() {
  const materials = useBarnMaterials();
  const geometries = useBarnGeometries();

  return (
    <group>
      <mesh position={[0, 5, -HALF_DEPTH - 1]} scale={[80, 30, 1]}>
        <planeGeometry />
        <meshBasicMaterial color={AUTUMN_COLORS.background} />
      </mesh>
      <RoomShell
        fogColor={AUTUMN_COLORS.fog}
        floorColor={AUTUMN_COLORS.floorWood}
        wallColor={AUTUMN_COLORS.wallWood}
        ceilingColor={AUTUMN_COLORS.ceiling}
        floorMaterial={materials.floor}
        wallMaterial={materials.wall}
        ceilingMaterial={materials.ceiling}
        fogNear={15}
        fogFar={44}
      >
        <InstancedProp geometry={geometries.rafter} material={materials.beam} placements={RAFTERS} />
        <InstancedProp geometry={geometries.purlin} material={materials.beam} placements={PURLINS} />
        <InstancedProp geometry={geometries.post} material={materials.beam} placements={POSTS} />
        <InstancedProp geometry={geometries.brace} material={materials.beam} placements={BRACES} />
        <SunsetWindow frame={materials.beam} halo={materials.halo} />
      </RoomShell>
    </group>
  );
}
