import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ENVIRONMENT_ROOM } from '@/presentation/config/themed-environment.config';
import { WINTER_ARCHWAY } from '@/presentation/config/winter-porch.config';

const { FLOOR_Y, HALF_WIDTH, HEIGHT } = ENVIRONMENT_ROOM;
const WALL_WIDTH = HALF_WIDTH * 2;

/**
 * One rectangle of the back wall (x0..x1, y0..y1 relative to the floor) with
 * UVs taken from its place on the full wall, so a shared repeating texture
 * stays continuous across the pieces around the archway.
 */
function wallPiece(x0: number, x1: number, y0: number, y1: number): THREE.BufferGeometry {
  const width = x1 - x0;
  const height = y1 - y0;
  const plane = new THREE.PlaneGeometry(width, height);
  const uv = plane.getAttribute('uv');
  const u0 = (x0 + HALF_WIDTH) / WALL_WIDTH;
  const v0 = y0 / HEIGHT;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, u0 + (uv.getX(i) * width) / WALL_WIDTH, v0 + (uv.getY(i) * height) / HEIGHT);
  }
  plane.translate(x0 + width / 2, FLOOR_Y + y0 + height / 2, 0);
  return plane;
}

/** Back wall (facing +z at z = 0 locally) with the archway cut out: left, right and lintel pieces. */
export function createArchedBackWall(): THREE.BufferGeometry {
  const half = WINTER_ARCHWAY.WIDTH / 2;
  const parts = [
    wallPiece(-HALF_WIDTH, -half, 0, HEIGHT),
    wallPiece(half, HALF_WIDTH, 0, HEIGHT),
    wallPiece(-half, half, WINTER_ARCHWAY.HEIGHT, HEIGHT),
  ];
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  return merged;
}

/**
 * Rolling snow ground: a subdivided plane (facing up) with soft drifts that
 * swell towards the far edge. Deterministic, computed once.
 */
export function createSnowGroundGeometry(width: number, depth: number, segments: readonly [number, number], driftHeight: number): THREE.BufferGeometry {
  const plane = new THREE.PlaneGeometry(width, depth, segments[0], segments[1]);
  plane.rotateX(-Math.PI / 2);
  const position = plane.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const far = 0.5 - z / depth;
    const swell = Math.sin(x * 0.45 + z * 0.2) * 0.5 + Math.sin(x * 0.17 - z * 0.37 + 1.3) * 0.5;
    position.setY(i, (0.35 + swell * 0.65) * driftHeight * (0.4 + far));
  }
  plane.computeVertexNormals();
  return plane;
}

/** Cone with its base at y = 0 (unit radius and height) for instanced pines. */
export function createPineTierGeometry(segments = 10): THREE.BufferGeometry {
  const cone = new THREE.ConeGeometry(1, 1, segments, 1);
  cone.translate(0, 0.5, 0);
  return cone;
}

/** Half cylinder along x (flat side down, unit radius / length) for snow cornices and sill drifts. */
export function createSnowRollGeometry(): THREE.BufferGeometry {
  const roll = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI);
  // The half shell spans +x around the y axis; turning it about z lays it along x, dome up.
  roll.rotateZ(Math.PI / 2);
  return roll;
}
