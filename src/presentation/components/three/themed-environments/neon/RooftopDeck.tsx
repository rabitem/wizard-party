'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { NEON_COLORS, NEON_LAYOUT, NEON_REALISM, NEON_ROOF_UNITS } from '@/presentation/config/neon-environment.config';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { addSurfaceDetail, getPbrTextureSet, InstancedProp, useDisposables, type PropPlacement } from '../primitives';
import { createDeckGridTexture } from './neon-textures';

const FLOOR = ENVIRONMENT_ROOM.FLOOR_Y;
const { DECK_HALF: HALF, DECK_THICKNESS, PARAPET_HEIGHT, PARAPET_DEPTH } = NEON_LAYOUT;
const STRIP = { HEIGHT: 0.05, DEPTH: 0.07 } as const;
const DECK_EMISSIVE_INTENSITY = 0.55;
const UNIT_VENT = { SIZE: 0.5, HEIGHT: 0.08 } as const;
const { DECK, BLOOM_BOOST } = NEON_REALISM;

/** Four parapet walls around the deck edge: [x, z, length, rotationY] */
const EDGES: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, -HALF, HALF * 2, 0],
  [0, HALF, HALF * 2, 0],
  [-HALF, 0, HALF * 2, Math.PI / 2],
  [HALF, 0, HALF * 2, Math.PI / 2],
];

const PARAPETS: PropPlacement[] = EDGES.map(([x, z, length, rotationY]) => ({
  position: [x, FLOOR + PARAPET_HEIGHT / 2, z],
  scale: [length + PARAPET_DEPTH, PARAPET_HEIGHT, PARAPET_DEPTH],
  rotationY,
}));

/** Neon strip along the parapet tops, alternating cyan and magenta walls. */
const STRIPS: PropPlacement[] = EDGES.map(([x, z, length, rotationY], i) => ({
  position: [x, FLOOR + PARAPET_HEIGHT + STRIP.HEIGHT / 2, z],
  scale: [length, STRIP.HEIGHT, STRIP.DEPTH],
  rotationY,
  color: i % 2 === 0 ? NEON_COLORS.magenta : NEON_COLORS.cyan,
}));

const UNITS: PropPlacement[] = NEON_ROOF_UNITS.map(([x, z, w, h, d]) => ({
  position: [x, FLOOR + h / 2, z],
  scale: [w, h, d],
}));

/** Glowing vent grilles on top of each roof unit. */
const VENTS: PropPlacement[] = NEON_ROOF_UNITS.map(([x, z, , h], i) => ({
  position: [x, FLOOR + h + UNIT_VENT.HEIGHT / 2, z],
  scale: [UNIT_VENT.SIZE, UNIT_VENT.HEIGHT, UNIT_VENT.SIZE],
  color: i % 2 === 0 ? NEON_COLORS.cyan : NEON_COLORS.violet,
}));

/**
 * Rain-wet rooftop: dark deck with procedural puddles (wet-floor PBR set:
 * glossy pools in a rougher concrete, fine normal ripples) and faint glowing
 * grid seams, a low parapet topped by bloom-bright neon strips and weathered
 * AC units with lit vents. PBR textures are cached by the toolkit and not
 * disposed here.
 */
export function RooftopDeck() {
  const assets = useMemo(() => {
    const grid = createDeckGridTexture(NEON_LAYOUT.DECK_GRID_REPEAT);
    const wet = getPbrTextureSet('wetFloor', { color: DECK.COLOR, accent: DECK.ACCENT, repeat: DECK.REPEAT });
    const neon = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
    neon.color.multiplyScalar(BLOOM_BOOST.STRIPS);
    return {
      grid,
      box: new THREE.BoxGeometry(1, 1, 1),
      deck: new THREE.MeshStandardMaterial({
        color: '#ffffff',
        map: wet.map,
        roughnessMap: wet.roughnessMap,
        normalMap: wet.normalMap,
        normalScale: new THREE.Vector2(DECK.NORMAL_SCALE, DECK.NORMAL_SCALE),
        roughness: DECK.ROUGHNESS,
        metalness: DECK.METALNESS,
        emissive: '#ffffff',
        emissiveMap: grid,
        emissiveIntensity: DECK_EMISSIVE_INTENSITY,
      }),
      parapet: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: NEON_COLORS.parapet, roughness: 0.75, metalness: 0.15 }), {
        scale: 3,
        normalStrength: 0.4,
      }),
      unit: addSurfaceDetail(new THREE.MeshStandardMaterial({ color: NEON_COLORS.pole, roughness: 0.4, metalness: 0.75 }), {
        scale: 2,
        normalStrength: 0.2,
      }),
      neon,
    };
  }, []);
  useDisposables(assets);

  return (
    <group>
      <mesh position={[0, FLOOR - DECK_THICKNESS / 2, 0]} material={assets.deck}>
        <boxGeometry args={[HALF * 2, DECK_THICKNESS, HALF * 2]} />
      </mesh>
      <InstancedProp geometry={assets.box} material={assets.parapet} placements={PARAPETS} />
      <InstancedProp geometry={assets.box} material={assets.neon} placements={STRIPS} />
      <InstancedProp geometry={assets.box} material={assets.unit} placements={UNITS} />
      <InstancedProp geometry={assets.box} material={assets.neon} placements={VENTS} />
    </group>
  );
}
