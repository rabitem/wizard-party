import * as THREE from 'three';
import {
  HALLOWEEN_COLORS,
  HALLOWEEN_FLOOR_CANDLES,
  HALLOWEEN_FLOOR_PUMPKINS,
  HALLOWEEN_GRAVESTONES,
  HALLOWEEN_LAYOUT,
  HALLOWEEN_SKULLS,
} from '@/presentation/config/halloween-environment.config';
import { ENVIRONMENT_ROOM, type Vec3 } from '@/presentation/config/themed-environment.config';
import type { CandlePlacement, PropPlacement, PumpkinPlacement } from '../primitives';

/**
 * Pure layout + geometry builders for the Haunted Manor props, kept out of
 * the components so they stay small and the placements are computed once.
 */

export const SHELF = { THICKNESS: 0.1, DEPTH: 0.55, BRACKET: 0.3 } as const;
const FLOOR_Y = ENVIRONMENT_ROOM.FLOOR_Y;
const PUMPKIN_TINTS = [HALLOWEEN_COLORS.pumpkin, HALLOWEEN_COLORS.pumpkinPale, HALLOWEEN_COLORS.pumpkinGreen];

/** World position of a point on a shelf, given local x and height above the board. */
function onShelf(shelf: readonly [number, number, number, number], localX: number, lift = 0): Vec3 {
  const [x, y, z, rotationY] = shelf;
  const depth = SHELF.DEPTH / 2;
  return [
    x + Math.cos(rotationY) * localX + Math.sin(rotationY) * depth,
    y + SHELF.THICKNESS / 2 + lift,
    z - Math.sin(rotationY) * localX + Math.cos(rotationY) * depth,
  ];
}

export const SHELF_PLACEMENTS: PropPlacement[] = HALLOWEEN_LAYOUT.SHELVES.map(([x, y, z, rotationY]) => ({
  position: onShelf([x, y, z, rotationY], 0, -SHELF.THICKNESS / 2),
  rotationY,
}));

export const MANOR_PUMPKINS: PumpkinPlacement[] = [
  ...HALLOWEEN_FLOOR_PUMPKINS.map(([x, z, scale, rotationY, carved], i) => ({
    position: [x, FLOOR_Y, z] as Vec3,
    scale,
    rotationY,
    carved,
    color: carved ? HALLOWEEN_COLORS.pumpkin : PUMPKIN_TINTS[i % PUMPKIN_TINTS.length],
  })),
  ...HALLOWEEN_LAYOUT.SHELVES.flatMap((shelf, i) => [
    { position: onShelf(shelf, -0.9), scale: 0.55, rotationY: shelf[3], carved: true, color: HALLOWEEN_COLORS.pumpkin },
    {
      position: onShelf(shelf, 0.95),
      scale: 0.38,
      rotationY: shelf[3] + 0.4,
      carved: i % 2 === 0,
      color: i % 2 === 0 ? HALLOWEEN_COLORS.pumpkin : HALLOWEEN_COLORS.pumpkinPale,
    },
  ]),
];

export const MANOR_CANDLES: CandlePlacement[] = [
  ...HALLOWEEN_FLOOR_CANDLES.map(([x, z, height, scale], i) => ({
    position: [x, FLOOR_Y, z] as Vec3,
    height,
    scale,
    color: i % 3 === 2 ? HALLOWEEN_COLORS.candleWaxBlack : HALLOWEEN_COLORS.candleWax,
  })),
  ...HALLOWEEN_LAYOUT.SHELVES.flatMap((shelf) => [
    { position: onShelf(shelf, -0.25), height: 1.5, scale: 0.9 },
    { position: onShelf(shelf, 0.1), height: 0.9, scale: 0.85 },
    { position: onShelf(shelf, 1.4), height: 1.2, scale: 0.8 },
  ]),
];

export const GRAVESTONE_PLACEMENTS: PropPlacement[] = HALLOWEEN_GRAVESTONES.map(([x, z, scale, rotationY], i) => ({
  position: [x, FLOOR_Y, z],
  scale,
  rotationY,
  tilt: [i % 2 === 0 ? -0.08 : 0.05, i % 3 === 0 ? 0.07 : -0.04],
}));

export const SKULL_PLACEMENTS: PropPlacement[] = HALLOWEEN_SKULLS.map(([x, y, z, scale, rotationY]) => ({
  position: [x, y, z],
  scale,
  rotationY,
}));

/** Rounded-top headstone with a carved cross, base at y = 0. */
export function createGravestoneGeometry(): THREE.BufferGeometry {
  const width = 0.7;
  const height = 1.0;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height - width / 2);
  shape.absarc(0, height - width / 2, width / 2, 0, Math.PI, false);
  shape.closePath();
  const cross = new THREE.Path();
  const arm = 0.05;
  cross.moveTo(-arm, 0.35);
  cross.lineTo(arm, 0.35);
  cross.lineTo(arm, 0.6);
  cross.lineTo(0.16, 0.6);
  cross.lineTo(0.16, 0.68);
  cross.lineTo(arm, 0.68);
  cross.lineTo(arm, 0.82);
  cross.lineTo(-arm, 0.82);
  cross.lineTo(-arm, 0.68);
  cross.lineTo(-0.16, 0.68);
  cross.lineTo(-0.16, 0.6);
  cross.lineTo(-arm, 0.6);
  cross.closePath();
  shape.holes.push(cross);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 1,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -0.08);
  return geometry;
}

/** Skull pieces (cranium, jaw, eye sockets), base at y = 0, facing +z. */
export function createSkullGeometries() {
  const cranium = new THREE.SphereGeometry(0.16, 12, 10);
  cranium.scale(1, 0.95, 1.15);
  cranium.translate(0, 0.2, 0);
  const jaw = new THREE.BoxGeometry(0.18, 0.09, 0.14);
  jaw.translate(0, 0.06, 0.08);
  const socket = new THREE.SphereGeometry(0.042, 8, 6);
  socket.scale(1, 1.1, 0.5);
  return { cranium, jaw, socket };
}

export const SKULL_SOCKET_OFFSETS: Vec3[] = [
  [-0.06, 0.2, 0.165],
  [0.06, 0.2, 0.165],
];
