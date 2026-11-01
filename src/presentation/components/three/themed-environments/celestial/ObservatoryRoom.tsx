'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { CELESTIAL_COLORS, CELESTIAL_DOME, CELESTIAL_LAYOUT } from '@/presentation/config/celestial-environment.config';
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
import { createCeilingRingGeometry } from './celestial-geometry';
import { createZodiacTexture } from './celestial-textures';
import { createGoldMaterial } from './celestial-materials';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT } = ENVIRONMENT_ROOM;
const { PILLAR_SIZE, CORNICE_HEIGHT } = CELESTIAL_LAYOUT;
const CAP_HEIGHT = 0.3;
const FLOOR_LIFT = 0.006;
const WALL_INSET = PILLAR_SIZE[1] / 2;

const PILLARS: PropPlacement[] = [
  ...CELESTIAL_LAYOUT.PILLAR_BACK_XS.map((x): PropPlacement => ({ position: [x, FLOOR_Y + HEIGHT / 2, -HALF_DEPTH + WALL_INSET] })),
  ...CELESTIAL_LAYOUT.PILLAR_SIDE_ZS.flatMap((z): PropPlacement[] => [
    { position: [-HALF_WIDTH + WALL_INSET, FLOOR_Y + HEIGHT / 2, z], rotationY: Math.PI / 2 },
    { position: [HALF_WIDTH - WALL_INSET, FLOOR_Y + HEIGHT / 2, z], rotationY: Math.PI / 2 },
  ]),
];
/** Gilded capital and base on every pilaster. */
const CAPS: PropPlacement[] = PILLARS.flatMap((p): PropPlacement[] => [
  { ...p, position: [p.position[0], FLOOR_Y + HEIGHT - CORNICE_HEIGHT - CAP_HEIGHT / 2, p.position[2]] },
  { ...p, position: [p.position[0], FLOOR_Y + CAP_HEIGHT / 2, p.position[2]] },
]);
/** Gold cornice band along the top of each wall (scaled to wall width). */
const CORNICES: PropPlacement[] = ROOM_WALLS.map((wall) => ({
  position: [wall.position[0] * 0.995, FLOOR_Y + HEIGHT - CORNICE_HEIGHT / 2, wall.position[2] * 0.995],
  rotationY: wall.rotationY,
  scale: [wall.width, 1, 1],
}));

/** Stone walls, tiled floor, gilded pilasters and cornice, ceiling slab with a dome opening and the zodiac floor. */
export function ObservatoryRoom() {
  const assets = useMemo(() => {
    const zodiacMap = createZodiacTexture();
    return {
      zodiacMap,
      // Procedural PBR stone (cached texture sets): dressed ashlar walls and polished floor tiles.
      wall: createPbrMaterial('stone', {
        color: CELESTIAL_COLORS.stone,
        accent: CELESTIAL_COLORS.mortar,
        seed: 41,
        repeat: [6, 2],
        normalScale: 0.8,
      }),
      floor: createPbrMaterial('stone', {
        color: CELESTIAL_COLORS.floorTile,
        accent: CELESTIAL_COLORS.floorMortar,
        seed: 7,
        repeat: [8, 8],
        roughness: 0.6,
        metalness: 0.1,
        normalScale: 0.4,
      }),
      hiddenCeiling: new THREE.MeshBasicMaterial({ visible: false }),
      ceiling: new THREE.MeshStandardMaterial({ color: CELESTIAL_COLORS.stoneDark, roughness: 0.95, side: THREE.DoubleSide }),
      zodiac: new THREE.MeshStandardMaterial({ map: zodiacMap, roughness: 0.4, metalness: 0.2, transparent: true }),
      pillar: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: CELESTIAL_COLORS.stoneDark, roughness: 0.8 }), { scale: 2 }),
      gold: createGoldMaterial({ emissiveIntensity: 0.25, roughness: 0.35 }),
      pillarGeometry: new THREE.BoxGeometry(PILLAR_SIZE[0], HEIGHT, PILLAR_SIZE[1]),
      capGeometry: new THREE.BoxGeometry(PILLAR_SIZE[0] * 1.3, CAP_HEIGHT, PILLAR_SIZE[1] * 1.4),
      corniceGeometry: new THREE.BoxGeometry(1, CORNICE_HEIGHT, 0.3),
      ceilingGeometry: createCeilingRingGeometry(HALF_WIDTH, HALF_DEPTH, CELESTIAL_DOME.RADIUS),
      zodiacGeometry: new THREE.CircleGeometry(CELESTIAL_LAYOUT.ZODIAC_RADIUS, 48),
    };
  }, []);
  useDisposables(assets);

  return (
    <RoomShell
      fogColor={CELESTIAL_COLORS.fog}
      floorColor={CELESTIAL_COLORS.floorTile}
      wallColor={CELESTIAL_COLORS.stone}
      ceilingColor={CELESTIAL_COLORS.stoneDark}
      floorMaterial={assets.floor}
      wallMaterial={assets.wall}
      ceilingMaterial={assets.hiddenCeiling}
      fogNear={15}
      fogFar={46}
    >
      <mesh
        geometry={assets.ceilingGeometry}
        material={assets.ceiling}
        position={[0, CELESTIAL_DOME.BASE_Y, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={assets.zodiacGeometry}
        material={assets.zodiac}
        position={[0, FLOOR_Y + FLOOR_LIFT, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <InstancedProp geometry={assets.pillarGeometry} material={assets.pillar} placements={PILLARS} />
      <InstancedProp geometry={assets.capGeometry} material={assets.gold} placements={CAPS} />
      <InstancedProp geometry={assets.corniceGeometry} material={assets.gold} placements={CORNICES} />
    </RoomShell>
  );
}
