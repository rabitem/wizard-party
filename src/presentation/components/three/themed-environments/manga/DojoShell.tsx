'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { MANGA_COLORS, MANGA_DAYLIGHT, MANGA_ROOM, MANGA_TOKONOMA, MANGA_WINDOW } from '@/presentation/config/manga-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { InstancedProp, RoomShell, useDisposables, type PropPlacement } from '../primitives';
import { createWoodToonMaterial } from './dojo-materials';
import { createShojiGlowTexture, createShojiTexture, createTatamiBumpTexture, createTatamiTexture } from './dojo-surface-textures';
import { createInkMountainTexture } from './manga-textures';

const { FLOOR_Y, HALF_WIDTH, HALF_DEPTH, HEIGHT, POST_SIZE, POST_SPACING } = MANGA_ROOM;
/** Woven rush relief on the tatami */
const TATAMI_BUMP = 1.4;
const BEAM = { HEIGHT: 0.36, DEPTH: 0.3, INSET: 0.2 } as const;
const FRAME_DEPTH = 0.24;
const WINDOW_Z = -HALF_DEPTH + 0.03;
const WINDOW_LEFT = MANGA_WINDOW.CENTER_X - MANGA_WINDOW.WIDTH / 2;
const WINDOW_RIGHT = MANGA_WINDOW.CENTER_X + MANGA_WINDOW.WIDTH / 2;
const WINDOW_CENTER_Y = FLOOR_Y + MANGA_WINDOW.BOTTOM + MANGA_WINDOW.HEIGHT / 2;

/** Positions along a wall from -half to +half at a fixed spacing. */
function along(half: number): number[] {
  const count = Math.floor((half * 2) / POST_SPACING);
  return Array.from({ length: count + 1 }, (_, i) => -half + (i * half * 2) / count);
}

/** Wooden hashira posts standing against the back and side walls. */
const POSTS: PropPlacement[] = (() => {
  const y = FLOOR_Y + HEIGHT / 2;
  const scale: Vec3 = [POST_SIZE, HEIGHT, POST_SIZE];
  const inset = POST_SIZE / 2;
  const back = along(HALF_WIDTH)
    .filter((x) => x < WINDOW_LEFT - POST_SIZE || x > WINDOW_RIGHT + POST_SIZE)
    .map((x) => ({ position: [x, y, -HALF_DEPTH + inset] as Vec3, scale }));
  const sides = along(HALF_DEPTH).flatMap((z) => [
    { position: [-HALF_WIDTH + inset, y, z] as Vec3, scale },
    { position: [HALF_WIDTH - inset, y, z] as Vec3, scale },
  ]);
  return [...back, ...sides];
})();

/** Exposed ceiling beams spanning the room left to right. */
const CEILING_BEAMS: PropPlacement[] = Array.from({ length: MANGA_ROOM.CEILING_BEAMS }, (_, i) => ({
  position: [0, FLOOR_Y + HEIGHT - BEAM.HEIGHT / 2, -HALF_DEPTH + ((i + 0.5) * HALF_DEPTH * 2) / MANGA_ROOM.CEILING_BEAMS],
  scale: [HALF_WIDTH * 2, BEAM.HEIGHT, BEAM.DEPTH],
}));

/** Nageshi rail running around the walls at the top of the shoji. */
const WALL_RAILS: PropPlacement[] = (() => {
  const y = FLOOR_Y + MANGA_ROOM.BEAM_HEIGHT;
  return [
    { position: [0, y, -HALF_DEPTH + BEAM.INSET / 2], scale: [HALF_WIDTH * 2, 0.24, BEAM.INSET] },
    { position: [-HALF_WIDTH + BEAM.INSET / 2, y, 0], scale: [BEAM.INSET, 0.24, HALF_DEPTH * 2] },
    { position: [HALF_WIDTH - BEAM.INSET / 2, y, 0], scale: [BEAM.INSET, 0.24, HALF_DEPTH * 2] },
  ];
})();

/** Frame and sliding-door mullions around the open back wall. */
const WINDOW_FRAME: PropPlacement[] = (() => {
  const { WIDTH, HEIGHT: H, FRAME, MULLIONS } = MANGA_WINDOW;
  const z = WINDOW_Z + FRAME_DEPTH / 2;
  const top = WINDOW_CENTER_Y + H / 2;
  const bottom = WINDOW_CENTER_Y - H / 2;
  const frame: PropPlacement[] = [
    { position: [MANGA_WINDOW.CENTER_X, top, z], scale: [WIDTH + FRAME * 2, FRAME, FRAME_DEPTH] },
    { position: [MANGA_WINDOW.CENTER_X, bottom, z], scale: [WIDTH + FRAME * 2, FRAME, FRAME_DEPTH] },
    { position: [WINDOW_LEFT, WINDOW_CENTER_Y, z], scale: [FRAME, H, FRAME_DEPTH] },
    { position: [WINDOW_RIGHT, WINDOW_CENTER_Y, z], scale: [FRAME, H, FRAME_DEPTH] },
  ];
  for (let i = 1; i <= MULLIONS; i++) {
    const x = WINDOW_LEFT + (i * WIDTH) / (MULLIONS + 1);
    frame.push({ position: [x, WINDOW_CENTER_Y, z], scale: [FRAME * 0.5, H, FRAME_DEPTH * 0.6] });
  }
  return frame;
})();

const TOKONOMA: PropPlacement[] = [
  {
    position: [MANGA_TOKONOMA.POSITION[0], FLOOR_Y + MANGA_TOKONOMA.SIZE[1] / 2, MANGA_TOKONOMA.POSITION[2]],
    scale: MANGA_TOKONOMA.SIZE,
  },
];

/**
 * Dojo architecture: woven tatami floor (bump-mapped), shoji walls whose
 * washi panes glow with daylight behind the dark kumiko lattice, grained
 * wooden posts, rails and ceiling beams, a raised tokonoma and the ink-wash
 * mountain view.
 */
export function DojoShell() {
  const assets = useMemo(() => {
    const tatamiMap = createTatamiTexture();
    const tatamiBump = createTatamiBumpTexture();
    const shojiMap = createShojiTexture();
    const shojiGlow = createShojiGlowTexture();
    const mountainMap = createInkMountainTexture();
    const posts = createWoodToonMaterial(MANGA_COLORS.woodLight, MANGA_COLORS.wood, true);
    const beams = createWoodToonMaterial(MANGA_COLORS.wood, MANGA_COLORS.woodDark);
    return {
      tatamiMap,
      tatamiBump,
      shojiMap,
      shojiGlow,
      mountainMap,
      postMap: posts.map,
      postNormal: posts.normalMap,
      beamMap: beams.map,
      beamNormal: beams.normalMap,
      floor: new THREE.MeshStandardMaterial({ map: tatamiMap, bumpMap: tatamiBump, bumpScale: TATAMI_BUMP, roughness: 0.9 }),
      walls: new THREE.MeshStandardMaterial({
        map: shojiMap,
        emissiveMap: shojiGlow,
        emissive: MANGA_DAYLIGHT.SHOJI_GLOW_COLOR,
        emissiveIntensity: MANGA_DAYLIGHT.SHOJI_GLOW,
        roughness: 0.9,
      }),
      ceiling: new THREE.MeshStandardMaterial({ color: MANGA_COLORS.ceiling, roughness: 0.95 }),
      view: new THREE.MeshBasicMaterial({ map: mountainMap, toneMapped: false }),
      wood: posts.material,
      woodDark: beams.material,
      box: new THREE.BoxGeometry(1, 1, 1),
      plane: new THREE.PlaneGeometry(MANGA_WINDOW.WIDTH, MANGA_WINDOW.HEIGHT),
    };
  }, []);
  useDisposables(assets);

  return (
    <RoomShell
      fogColor={MANGA_COLORS.fog}
      floorColor={MANGA_COLORS.tatami}
      wallColor={MANGA_COLORS.paper}
      ceilingColor={MANGA_COLORS.ceiling}
      floorMaterial={assets.floor}
      wallMaterial={assets.walls}
      ceilingMaterial={assets.ceiling}
      fogNear={MANGA_ROOM.FOG_NEAR}
      fogFar={MANGA_ROOM.FOG_FAR}
    >
      <mesh geometry={assets.plane} material={assets.view} position={[MANGA_WINDOW.CENTER_X, WINDOW_CENTER_Y, WINDOW_Z]} />
      <InstancedProp geometry={assets.box} material={assets.woodDark} placements={WINDOW_FRAME} />
      <InstancedProp geometry={assets.box} material={assets.wood} placements={POSTS} />
      <InstancedProp geometry={assets.box} material={assets.woodDark} placements={WALL_RAILS} />
      <InstancedProp geometry={assets.box} material={assets.woodDark} placements={CEILING_BEAMS} />
      <InstancedProp geometry={assets.box} material={assets.woodDark} placements={TOKONOMA} />
    </RoomShell>
  );
}
