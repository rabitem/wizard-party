'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { SUMMER_COLORS, SUMMER_LAYOUT } from '@/presentation/config/summer-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, createPbrMaterial, InstancedProp, SceneFog, useDisposables, type PropPlacement } from '../primitives';
import { createSkyTexture } from './summer-geometry';
import { SeaSurface, SunsetSky } from './SunsetSkyAndSea';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const { DECK_HALF_WIDTH: HALF_W, DECK_Z, DECK_THICKNESS, RAIL_HEIGHT, RAIL_POST_SPACING, RAIL_GAP_HALF } = SUMMER_LAYOUT;
const DECK_DEPTH = DECK_Z[1] - DECK_Z[0];
const DECK_CENTER_Z = (DECK_Z[0] + DECK_Z[1]) / 2;
const POST = 0.12;
const RAIL = { HEIGHT: 0.09, DEPTH: 0.14 } as const;
/** Far fog sits beyond the camera far plane so the horizon only hazes, never vanishes */
const FOG = { NEAR: 22, FAR: 120 } as const;
const STEP = { COUNT: 3, RISE: 0.15, RUN: 0.45 } as const;
/** Deck planks: ~0.3 units wide, running along x */
const DECK_REPEAT: [number, number] = [6, 15];
/** Sand: wind-rippled grains with sparse sparkling glints (the 'snow' painter in sand tones) */
const SAND = { ACCENT: '#b8956a', REPEAT: [36, 20] as [number, number] } as const;

/** Posts along a rail run from (x1, z1) to (x2, z2), skipping the step gap. */
function railRun(x1: number, z1: number, x2: number, z2: number, gap = 0): { posts: PropPlacement[]; rails: PropPlacement[] } {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const count = Math.round(length / RAIL_POST_SPACING);
  const rotationY = -Math.atan2(z2 - z1, x2 - x1);
  const posts: PropPlacement[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x1 + (x2 - x1) * t;
    if (gap > 0 && Math.abs(x) < gap) continue;
    posts.push({ position: [x, FLOOR + RAIL_HEIGHT / 2, z1 + (z2 - z1) * t] });
  }
  const rails: PropPlacement[] = [];
  const segments: Array<[number, number]> = gap > 0 ? [[x1, -gap], [gap, x2]] : [[x1, x2]];
  segments.forEach(([a, b]) => {
    const tA = (a - x1) / (x2 - x1 || 1);
    const tB = (b - x1) / (x2 - x1 || 1);
    const segLength = gap > 0 ? Math.abs(b - a) : length;
    const midT = gap > 0 ? (tA + tB) / 2 : 0.5;
    const position: [number, number, number] = [x1 + (x2 - x1) * midT, 0, z1 + (z2 - z1) * midT];
    [RAIL_HEIGHT, RAIL_HEIGHT * 0.5].forEach((h) =>
      rails.push({ position: [position[0], FLOOR + h, position[2]], scale: [segLength, RAIL.HEIGHT, RAIL.DEPTH], rotationY }),
    );
  });
  return { posts, rails };
}

const RAILING = [
  railRun(-HALF_W, DECK_Z[0], HALF_W, DECK_Z[0], RAIL_GAP_HALF),
  railRun(-HALF_W, DECK_Z[0], -HALF_W, DECK_Z[1]),
  railRun(HALF_W, DECK_Z[0], HALF_W, DECK_Z[1]),
];
const POSTS: PropPlacement[] = RAILING.flatMap((run) => run.posts).map((post) => ({ ...post, scale: [POST, RAIL_HEIGHT, POST] }));
const RAILS = RAILING.flatMap((run) => run.rails);
const STEPS: PropPlacement[] = Array.from({ length: STEP.COUNT }, (_, i) => ({
  position: [0, FLOOR - (i + 1) * STEP.RISE, DECK_Z[0] - (i + 0.5) * STEP.RUN],
  scale: [RAIL_GAP_HALF * 2, STEP.RISE, STEP.RUN],
}));
const ISLANDS: PropPlacement[] = SUMMER_LAYOUT.ISLANDS.map(([x, z, width, height]) => ({
  position: [x, SUMMER_LAYOUT.SEA_Y, z],
  scale: [width / 2, height, width / 5],
}));

/**
 * Open-air terrace: sunset sky dome, setting sun with its reflection on a
 * shimmering sea, distant islands, a sandy beach, a plank deck with white
 * railings and steps down to the sand.
 */
export function SeasideTerrace() {
  const assets = useMemo(
    () => ({
      skyGradient: createSkyTexture(),
      sand: createPbrMaterial('snow', { color: SUMMER_COLORS.sand, accent: SAND.ACCENT, repeat: SAND.REPEAT, normalScale: 0.5, seed: 5 }),
      deck: createPbrMaterial('wood', { color: SUMMER_COLORS.deck, repeat: DECK_REPEAT, normalScale: 0.7, seed: 43 }),
      rail: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: SUMMER_COLORS.rail, roughness: 0.6 }), { scale: 2, normalStrength: 0.3 }),
      islandMaterial: new THREE.MeshBasicMaterial({ color: SUMMER_COLORS.island }),
      box: new THREE.BoxGeometry(1, 1, 1),
      islandGeometry: new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    }),
    [],
  );
  useDisposables(assets);

  const [sandFar, sandNear] = SUMMER_LAYOUT.SAND_Z;
  return (
    <group>
      <SceneFog color={SUMMER_COLORS.fog} near={FOG.NEAR} far={FOG.FAR} />
      <SunsetSky gradient={assets.skyGradient} />
      <SeaSurface gradient={assets.skyGradient} />
      <InstancedProp geometry={assets.islandGeometry} material={assets.islandMaterial} placements={ISLANDS} />
      <mesh position={[0, SUMMER_LAYOUT.SAND_Y, (sandFar + sandNear) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={assets.sand}>
        <planeGeometry args={[SUMMER_LAYOUT.SEA_WIDTH, sandNear - sandFar]} />
      </mesh>

      <mesh position={[0, FLOOR - DECK_THICKNESS / 2, DECK_CENTER_Z]} material={assets.deck}>
        <boxGeometry args={[HALF_W * 2, DECK_THICKNESS, DECK_DEPTH]} />
      </mesh>
      <InstancedProp geometry={assets.box} material={assets.rail} placements={POSTS} />
      <InstancedProp geometry={assets.box} material={assets.rail} placements={RAILS} />
      <InstancedProp geometry={assets.box} material={assets.deck} placements={STEPS} />
    </group>
  );
}
