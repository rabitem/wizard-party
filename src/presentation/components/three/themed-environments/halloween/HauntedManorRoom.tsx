'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { HALLOWEEN_COLORS, HALLOWEEN_LAYOUT, HALLOWEEN_REALISM } from '@/presentation/config/halloween-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import {
  addSurfaceDetail,
  createPbrMaterial,
  InstancedProp,
  RoomShell,
  ROOM_WALLS,
  useDisposables,
  type PropPlacement,
} from '../primitives';
import { GothicWindow } from './GothicWindow';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const WAINSCOT_DEPTH = 0.1;
const RAIL_HEIGHT = 0.12;
const BEAM_SIZE = 0.45;
const PILLAR_SIZE = 0.7;
const { SURFACES } = HALLOWEEN_REALISM;

/**
 * Procedural PBR surfaces (colour + roughness + normal): rough castle stone
 * walls and pillars, worn flagstones and aged oak. Texture sets are cached and
 * shared; only the materials are owned (and disposed) here.
 */
function useManorMaterials() {
  const materials = useMemo(() => {
    const stone = { color: HALLOWEEN_COLORS.stone, accent: HALLOWEEN_COLORS.mortar, seed: 13 };
    return {
      wall: createPbrMaterial('stone', { ...stone, repeat: SURFACES.wallRepeat, normalScale: 0.9 }),
      floor: createPbrMaterial('stone', {
        color: HALLOWEEN_COLORS.floor,
        accent: HALLOWEEN_COLORS.mortar,
        seed: 29,
        repeat: SURFACES.floorRepeat,
        roughness: 0.85,
        normalScale: 0.7,
      }),
      ceiling: createPbrMaterial('wood', {
        color: HALLOWEEN_COLORS.wood,
        accent: HALLOWEEN_COLORS.woodDark,
        seed: 5,
        repeat: SURFACES.ceilingRepeat,
      }),
      wainscot: createPbrMaterial('wood', {
        color: HALLOWEEN_COLORS.wood,
        accent: HALLOWEEN_COLORS.woodDark,
        seed: 5,
        repeat: SURFACES.woodRepeat,
        roughness: 0.8,
      }),
      beam: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.woodDark, roughness: 0.9 }), {
        scale: 2,
        normalStrength: 0.5,
      }),
      pillar: createPbrMaterial('stone', { ...stone, color: '#5a5560', seed: 17, repeat: [0.25, 3], normalScale: 0.9 }),
      rail: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: HALLOWEEN_COLORS.woodDark, roughness: 0.6 }), { scale: 6 }),
    };
  }, []);
  useDisposables(materials);
  return materials;
}

function useManorGeometries() {
  const geometries = useMemo(
    () => ({
      beam: new THREE.BoxGeometry(HALF_WIDTH * 2, BEAM_SIZE, BEAM_SIZE),
      pillar: new THREE.BoxGeometry(PILLAR_SIZE, HEIGHT, PILLAR_SIZE),
    }),
    [],
  );
  useDisposables(geometries);
  return geometries;
}

/** Ceiling beams spaced evenly front to back. */
const BEAM_PLACEMENTS: PropPlacement[] = Array.from({ length: HALLOWEEN_LAYOUT.BEAM_COUNT }, (_, i) => ({
  position: [0, FLOOR_Y + HEIGHT - BEAM_SIZE / 2, -HALF_DEPTH + ((i + 0.5) * HALF_DEPTH * 2) / HALLOWEEN_LAYOUT.BEAM_COUNT],
}));

/** Stone pillars in the corners and between back-wall windows. */
const PILLAR_PLACEMENTS: PropPlacement[] = [
  [-HALF_WIDTH + PILLAR_SIZE / 2, -HALF_DEPTH + PILLAR_SIZE / 2],
  [HALF_WIDTH - PILLAR_SIZE / 2, -HALF_DEPTH + PILLAR_SIZE / 2],
  [-HALF_WIDTH + PILLAR_SIZE / 2, HALF_DEPTH - PILLAR_SIZE / 2],
  [HALF_WIDTH - PILLAR_SIZE / 2, HALF_DEPTH - PILLAR_SIZE / 2],
  [-12, -HALF_DEPTH + PILLAR_SIZE / 2],
  [12, -HALF_DEPTH + PILLAR_SIZE / 2],
].map(([x, z]) => ({ position: [x, FLOOR_Y + HEIGHT / 2, z] }));

/** Wood panelling with a moulded rail around the lower walls. */
function Wainscoting({ material, railMaterial }: { material: THREE.Material; railMaterial: THREE.Material }) {
  const height = HALLOWEEN_LAYOUT.WAINSCOT_HEIGHT;
  return (
    <group>
      {ROOM_WALLS.map((wall) => (
        <group key={wall.id} position={[wall.position[0], FLOOR_Y, wall.position[2]]} rotation={[0, wall.rotationY, 0]}>
          <mesh position={[0, height / 2, WAINSCOT_DEPTH / 2]} material={material}>
            <boxGeometry args={[wall.width, height, WAINSCOT_DEPTH]} />
          </mesh>
          <mesh position={[0, height + RAIL_HEIGHT / 2, WAINSCOT_DEPTH]} material={railMaterial}>
            <boxGeometry args={[wall.width, RAIL_HEIGHT, WAINSCOT_DEPTH * 1.8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Stone manor shell: walls, flagstone floor, beams, pillars and moonlit windows. */
export function HauntedManorRoom() {
  const materials = useManorMaterials();
  const geometries = useManorGeometries();
  const windowY = HALLOWEEN_LAYOUT.WINDOW_Y;

  return (
    <group>
      <mesh position={[0, 5, -HALF_DEPTH - 1]} scale={[80, 30, 1]}>
        <planeGeometry />
        <meshBasicMaterial color={HALLOWEEN_COLORS.background} />
      </mesh>

      <RoomShell
        fogColor={HALLOWEEN_COLORS.fog}
        floorColor={HALLOWEEN_COLORS.floor}
        wallColor={HALLOWEEN_COLORS.stone}
        ceilingColor={HALLOWEEN_COLORS.ceiling}
        floorMaterial={materials.floor}
        wallMaterial={materials.wall}
        ceilingMaterial={materials.ceiling}
        fogNear={12}
        fogFar={38}
      >
        <Wainscoting material={materials.wainscot} railMaterial={materials.rail} />
        <InstancedProp geometry={geometries.beam} material={materials.beam} placements={BEAM_PLACEMENTS} />
        <InstancedProp geometry={geometries.pillar} material={materials.pillar} placements={PILLAR_PLACEMENTS} />

        {HALLOWEEN_LAYOUT.WINDOW_XS.map((x) => (
          <GothicWindow key={`back-${x}`} position={[x, windowY, -HALF_DEPTH + 0.01]} withMoon={x === 0} />
        ))}
        {HALLOWEEN_LAYOUT.SIDE_WINDOW_ZS.map((z) => (
          <group key={`side-${z}`}>
            <GothicWindow position={[-HALF_WIDTH + 0.01, windowY, z]} rotationY={Math.PI / 2} />
            <GothicWindow position={[HALF_WIDTH - 0.01, windowY, z]} rotationY={-Math.PI / 2} />
          </group>
        ))}
      </RoomShell>
    </group>
  );
}
