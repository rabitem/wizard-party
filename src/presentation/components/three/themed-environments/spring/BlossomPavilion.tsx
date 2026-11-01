'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SPRING_COLORS, SPRING_LAYOUT, SPRING_SKY } from '@/presentation/config/spring-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, createPbrMaterial, InstancedProp, localMatrix, RoomShell, seededRandom, useDisposables, type PropPlacement } from '../primitives';
import { createSpringSkyTexture } from './spring-geometry';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH } = ENVIRONMENT_ROOM;
const { COLUMNS, COLUMN_HEIGHT, COLUMN_RADIUS, PERGOLA_Y } = SPRING_LAYOUT;
const BEAM = { WIDTH: 0.22, HEIGHT: 0.34 } as const;
const GIRDER = { WIDTH: 0.4, HEIGHT: 0.42 } as const;
const PLINTH = { SIZE: COLUMN_RADIUS * 3, HEIGHT: 0.36 } as const;
const HEDGE_DEPTH = 1.2;
const HEDGE_BUMP_SPACING = 1.1;
const PERGOLA_SPAN_X = 23.5;
const PERGOLA_Z_RANGE: [number, number] = [-12.5, 8];

const COLUMN_PLACEMENTS: PropPlacement[] = COLUMNS.map(([x, z]) => ({ position: [x, FLOOR_Y, z] }));
const SHAFT_OFFSET = localMatrix([0, COLUMN_HEIGHT / 2, 0], [0, 0, 0], [COLUMN_RADIUS, COLUMN_HEIGHT, COLUMN_RADIUS]);
const PLINTH_OFFSET = localMatrix([0, PLINTH.HEIGHT / 2, 0], [0, 0, 0], [PLINTH.SIZE, PLINTH.HEIGHT, PLINTH.SIZE]);
const CAPITAL_OFFSET = localMatrix([0, COLUMN_HEIGHT - PLINTH.HEIGHT / 2, 0], [0, 0, 0], [PLINTH.SIZE, PLINTH.HEIGHT, PLINTH.SIZE]);

/** Girders resting on consecutive column capitals (open towards the camera). */
const GIRDERS: PropPlacement[] = COLUMNS.slice(0, -1).map(([x1, z1], i) => {
  const [x2, z2] = COLUMNS[i + 1];
  const length = Math.hypot(x2 - x1, z2 - z1);
  return {
    position: [(x1 + x2) / 2, FLOOR_Y + COLUMN_HEIGHT + GIRDER.HEIGHT / 2, (z1 + z2) / 2],
    scale: [length + PLINTH.SIZE, GIRDER.HEIGHT, GIRDER.WIDTH],
    rotationY: -Math.atan2(z2 - z1, x2 - x1),
  };
});
/** Slatted pergola beams spanning the pavilion left to right. */
const BEAMS: PropPlacement[] = Array.from({ length: SPRING_LAYOUT.PERGOLA_BEAMS }, (_, i) => {
  const t = i / (SPRING_LAYOUT.PERGOLA_BEAMS - 1);
  return {
    position: [0, PERGOLA_Y + GIRDER.HEIGHT, PERGOLA_Z_RANGE[0] + t * (PERGOLA_Z_RANGE[1] - PERGOLA_Z_RANGE[0])],
    scale: [PERGOLA_SPAN_X, BEAM.HEIGHT, BEAM.WIDTH],
  };
});

const HEDGES: PropPlacement[] = SPRING_LAYOUT.HEDGES.map(([x, z, length, rot]) => ({
  position: [x, FLOOR_Y + SPRING_LAYOUT.HEDGE_HEIGHT / 2, z],
  scale: [length, SPRING_LAYOUT.HEDGE_HEIGHT, HEDGE_DEPTH],
  rotationY: rot,
}));
/** Leafy bumps along the hedge tops so they read as shrubs, not boxes. */
const HEDGE_BUMPS: PropPlacement[] = (() => {
  const rand = seededRandom(5);
  return SPRING_LAYOUT.HEDGES.flatMap(([x, z, length, rot]) => {
    const count = Math.floor(length / HEDGE_BUMP_SPACING);
    const dirX = Math.cos(rot);
    const dirZ = -Math.sin(rot);
    return Array.from({ length: count }, (_, i) => {
      const along = (i + 0.5) * HEDGE_BUMP_SPACING - length / 2;
      return {
        position: [x + dirX * along, FLOOR_Y + SPRING_LAYOUT.HEDGE_HEIGHT, z + dirZ * along] as Vec3,
        scale: [0.7 + rand() * 0.3, 0.45 + rand() * 0.25, 0.7] as Vec3,
        color: rand() > 0.5 ? SPRING_COLORS.hedge : SPRING_COLORS.hedgeLight,
      };
    });
  });
})();

/**
 * Open-air pavilion: PBR flagstone floor, dusk sky painted on the far walls,
 * white columns with a girder ring and pergola slats, and low hedges.
 */
export function BlossomPavilion() {
  const assets = useMemo(() => {
    const skyMap = createSpringSkyTexture();
    return {
      skyMap,
      // Procedural PBR flagstones (cached colour / roughness / normal maps).
      floor: createPbrMaterial('stone', { color: SPRING_COLORS.stone, accent: SPRING_COLORS.mortar, repeat: [9, 9], seed: 9, roughness: 0.9, normalScale: 0.55 }),
      sky: new THREE.MeshBasicMaterial({ map: skyMap, fog: false, toneMapped: false }),
      ceiling: new THREE.MeshBasicMaterial({ color: SPRING_SKY.stops[0][1], fog: false }),
      column: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.column, roughness: 0.6 }), { scale: 2, normalStrength: 0.25 }),
      wood: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.pergola, roughness: 0.7 }), { scale: 4, normalStrength: 0.3 }),
      hedge: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SPRING_COLORS.hedge, roughness: 0.95, flatShading: true }), { scale: 10, normalStrength: 0.9 }),
      bump: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), { scale: 3, normalStrength: 0.8 }),
      shaft: new THREE.CylinderGeometry(1, 1, 1, 12),
      box: new THREE.BoxGeometry(1, 1, 1),
      sphere: new THREE.IcosahedronGeometry(1, 1),
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <mesh position={[0, 5, -HALF_DEPTH - 1]} scale={[80, 30, 1]}>
        <planeGeometry />
        <meshBasicMaterial color={SPRING_COLORS.background} />
      </mesh>
      <RoomShell
        fogColor={SPRING_COLORS.fog}
        floorColor={SPRING_COLORS.stone}
        wallColor={SPRING_COLORS.background}
        ceilingColor={SPRING_COLORS.background}
        floorMaterial={assets.floor}
        wallMaterial={assets.sky}
        ceilingMaterial={assets.ceiling}
        fogNear={16}
        fogFar={48}
      >
        <InstancedProp geometry={assets.shaft} material={assets.column} placements={COLUMN_PLACEMENTS} offset={SHAFT_OFFSET} />
        <InstancedProp geometry={assets.box} material={assets.column} placements={COLUMN_PLACEMENTS} offset={PLINTH_OFFSET} />
        <InstancedProp geometry={assets.box} material={assets.column} placements={COLUMN_PLACEMENTS} offset={CAPITAL_OFFSET} />
        <InstancedProp geometry={assets.box} material={assets.wood} placements={GIRDERS} />
        <InstancedProp geometry={assets.box} material={assets.wood} placements={BEAMS} />
        <InstancedProp geometry={assets.box} material={assets.hedge} placements={HEDGES} />
        <InstancedProp geometry={assets.sphere} material={assets.bump} placements={HEDGE_BUMPS} />
      </RoomShell>
      <mesh position={[0, FLOOR_Y + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[HALF_WIDTH * 0.32, HALF_WIDTH * 0.34, 48]} />
        <meshStandardMaterial color={SPRING_COLORS.column} roughness={0.6} />
      </mesh>
    </group>
  );
}
