'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NEON_COLORS, NEON_LAYOUT, NEON_REALISM, NEON_SIGNS, type NeonSignLayout } from '@/presentation/config/neon-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import { createGlowMaterial, InstancedProp, useDisposables, useFlicker, type FlickerTarget, type PropPlacement } from '../primitives';
import { createNeonSignGeometry } from './neon-geometry';
import { createStreakTexture } from './neon-textures';
import { useNeonStutter, type StutterTarget } from './useNeonStutter';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const POST = { SIZE: 0.07, HALF_SPREAD: 0.75 } as const;
const BAR = { HEIGHT: 0.06, DEPTH: 0.06, BACK: 0.12 } as const;
const GLOW = { SCALE: 3.4, OPACITY: 0.55, AMPLITUDE: 0.12 } as const;
const TUBE_OPACITY = 0.95;
const REFLECTION_WIDTH = 1.6;
const REFLECTION_LIFT = 0.012;

/** Local (sign-space) offset rotated into world space around Y. */
function toWorld(sign: NeonSignLayout, [lx, ly, lz]: Vec3): Vec3 {
  const cos = Math.cos(sign.rotationY);
  const sin = Math.sin(sign.rotationY);
  const [x, y, z] = sign.position;
  return [x + lx * cos + lz * sin, y + ly, z - lx * sin + lz * cos];
}

/** Two posts from the deck up to each sign plus a crossbar behind the tubes. */
function buildFrames(): { posts: PropPlacement[]; bars: PropPlacement[] } {
  const posts: PropPlacement[] = [];
  const bars: PropPlacement[] = [];
  for (const sign of NEON_SIGNS) {
    const height = sign.position[1] - FLOOR;
    for (const side of [-1, 1]) {
      const [x, , z] = toWorld(sign, [side * POST.HALF_SPREAD * sign.scale, 0, -BAR.BACK]);
      posts.push({ position: [x, FLOOR + height / 2, z], scale: [POST.SIZE, height, POST.SIZE], rotationY: sign.rotationY });
    }
    bars.push({
      position: toWorld(sign, [0, 0, -BAR.BACK]),
      scale: [POST.HALF_SPREAD * 2 * sign.scale + POST.SIZE, BAR.HEIGHT, BAR.DEPTH],
      rotationY: sign.rotationY,
    });
  }
  return { posts, bars };
}

const FRAMES = buildFrames();

interface SignAssets {
  tube: THREE.BufferGeometry;
  tubeMaterial: THREE.MeshBasicMaterial;
  glow: THREE.SpriteMaterial;
  reflection: THREE.MeshBasicMaterial;
}

function createSignAssets(sign: NeonSignLayout, streak: THREE.Texture): SignAssets {
  const color = NEON_COLORS[sign.color];
  return {
    tube: createNeonSignGeometry(sign.shape, NEON_LAYOUT.TUBE_RADIUS / sign.scale),
    tubeMaterial: new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(NEON_REALISM.BLOOM_BOOST.TUBES),
      toneMapped: false,
      transparent: true,
      opacity: TUBE_OPACITY,
    }),
    glow: createGlowMaterial(color, GLOW.OPACITY),
    reflection: new THREE.MeshBasicMaterial({
      map: streak,
      color,
      transparent: true,
      opacity: NEON_LAYOUT.REFLECTION_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  };
}

function NeonSign({ sign, assets }: { sign: NeonSignLayout; assets: SignAssets }) {
  const length = NEON_LAYOUT.REFLECTION_LENGTH;
  const floorOffset = FLOOR - sign.position[1] + REFLECTION_LIFT;
  return (
    <group position={sign.position} rotation={[0, sign.rotationY, 0]}>
      <mesh geometry={assets.tube} material={assets.tubeMaterial} scale={sign.scale} />
      <sprite material={assets.glow} scale={[GLOW.SCALE * sign.scale, GLOW.SCALE * sign.scale, 1]} position={[0, 0, 0.1]} />
      {/* Wet-roof streak: a fading strip running from the sign towards the table */}
      <mesh position={[0, floorOffset, length / 2]} rotation={[-Math.PI / 2, 0, 0]} material={assets.reflection}>
        <planeGeometry args={[REFLECTION_WIDTH * sign.scale, length]} />
      </mesh>
    </group>
  );
}

/**
 * Neon tube signs (crescent moon, stars, wizard hat, bolt, diamond) on post
 * frames around the roof, each with a halo sprite and a fake wet reflection
 * on the deck. One frame callback drives every flicker; one tube is
 * deliberately faulty and stutters out in bursts. Tubes are pushed above
 * 1.0 so the room bloom catches them. Static with reduced motion.
 */
export function NeonSigns() {
  const assets = useMemo(() => {
    const streak = createStreakTexture();
    const signs = NEON_SIGNS.map((sign) => createSignAssets(sign, streak));
    const disposables: Record<string, { dispose: () => void }> = {
      streak,
      box: new THREE.BoxGeometry(1, 1, 1),
      frame: new THREE.MeshStandardMaterial({ color: NEON_COLORS.pole, roughness: 0.5, metalness: 0.6 }),
    };
    signs.forEach((s, i) => {
      disposables[`tube${i}`] = s.tube;
      disposables[`tubeMaterial${i}`] = s.tubeMaterial;
      disposables[`glow${i}`] = s.glow;
      disposables[`reflection${i}`] = s.reflection;
    });
    return { signs, disposables };
  }, []);
  useDisposables(assets.disposables);

  const flickers = useMemo<FlickerTarget[]>(
    () =>
      NEON_SIGNS.flatMap((sign, i) => {
        if (sign.faulty) return [];
        return [{ material: assets.signs[i].glow, base: GLOW.OPACITY, amplitude: GLOW.AMPLITUDE, phase: sign.phase, useOpacity: true }];
      }),
    [assets],
  );
  useFlicker(flickers);

  // Faulty tubes hum along and then stutter out in short bursts (tube + halo together)
  const stutters = useMemo<StutterTarget[]>(
    () =>
      NEON_SIGNS.flatMap((sign, i) =>
        sign.faulty
          ? [
              { material: assets.signs[i].tubeMaterial, base: TUBE_OPACITY, phase: sign.phase },
              { material: assets.signs[i].glow, base: GLOW.OPACITY, phase: sign.phase },
            ]
          : [],
      ),
    [assets],
  );
  useNeonStutter(stutters);

  const box = assets.disposables.box as THREE.BufferGeometry;
  const frame = assets.disposables.frame as THREE.Material;
  return (
    <group>
      {NEON_SIGNS.map((sign, i) => (
        <NeonSign key={sign.position.join(',')} sign={sign} assets={assets.signs[i]} />
      ))}
      <InstancedProp geometry={box} material={frame} placements={FRAMES.posts} />
      <InstancedProp geometry={box} material={frame} placements={FRAMES.bars} />
    </group>
  );
}
