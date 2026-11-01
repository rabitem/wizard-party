import * as THREE from 'three';
import { SURFACE_LAYOUT } from './surface.config';
import { seededRandom } from './surface-textures';

/**
 * Flat ring whose UVs run around the circle (u = angle * uRepeat, v = inner ->
 * outer) so strip textures (wood grain, tiles, runes, glyphs) follow the rim.
 */
export function createRadialRingGeometry(
  inner: number,
  outer: number,
  segments: number = SURFACE_LAYOUT.SEGMENTS,
  uRepeat = 1,
): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(inner, outer, segments, 1);
  const uv = geometry.attributes.uv as THREE.BufferAttribute;
  const perRing = segments + 1;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, ((i % perRing) / segments) * uRepeat, Math.floor(i / perRing));
  }
  uv.needsUpdate = true;
  return geometry;
}

export interface DriftRingOptions {
  radius: number;
  /** Radial width of the drift */
  width: number;
  /** Peak height above baseY */
  height: number;
  baseY: number;
  segments?: number;
  seed?: number;
}

const DRIFT_PROFILE_STEPS = 6;

/**
 * Soft snow drift running around a circle: a half-ellipse profile whose height
 * swells and thins with angle (layered sines + jitter), never fully vanishing.
 */
export function createDriftRingGeometry({
  radius,
  width,
  height,
  baseY,
  segments = 128,
  seed = 7,
}: DriftRingOptions): THREE.BufferGeometry {
  const rand = seededRandom(seed);
  const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const positions: number[] = [];
  const indices: number[] = [];
  const steps = DRIFT_PROFILE_STEPS;
  for (let s = 0; s <= segments; s++) {
    const angle = (s / segments) * Math.PI * 2;
    const swell =
      0.55 +
      0.25 * Math.sin(angle * 3 + phases[0]) +
      0.15 * Math.sin(angle * 7 + phases[1]) +
      0.08 * Math.sin(angle * 17 + phases[2]);
    const peak = height * Math.max(0.25, swell);
    for (let p = 0; p <= steps; p++) {
      const t = (p / steps) * 2 - 1;
      const r = radius + (t * width) / 2;
      const y = baseY + peak * Math.sqrt(Math.max(0, 1 - t * t));
      positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    }
  }
  const perRow = steps + 1;
  for (let s = 0; s < segments; s++) {
    for (let p = 0; p < steps; p++) {
      const a = s * perRow + p;
      const b = (s + 1) * perRow + p;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface SurfaceGeometries {
  disc: THREE.CircleGeometry;
  edge: THREE.RingGeometry;
  center: THREE.CircleGeometry;
  innerRing: THREE.RingGeometry;
  outerRing: THREE.RingGeometry;
  rim: THREE.RingGeometry;
  lipCap: THREE.TorusGeometry;
  outerCap: THREE.TorusGeometry;
  armrestCap: THREE.TorusGeometry;
}

let shared: SurfaceGeometries | null = null;

/**
 * Geometries shared by every themed surface (created once, never disposed:
 * they are tiny and reused across theme switches).
 */
export function getSurfaceGeometries(): SurfaceGeometries {
  if (shared) return shared;
  const L = SURFACE_LAYOUT;
  shared = {
    disc: new THREE.CircleGeometry(L.FELT_RADIUS, L.SEGMENTS),
    // Planar UVs (like the disc) so a tiled felt map continues across the edge band
    edge: new THREE.RingGeometry(L.EDGE_INNER, L.EDGE_OUTER, L.SEGMENTS),
    center: new THREE.CircleGeometry(L.CENTER_RADIUS, 48),
    innerRing: createRadialRingGeometry(L.INNER_RING[0], L.INNER_RING[1]),
    outerRing: createRadialRingGeometry(L.OUTER_RING[0], L.OUTER_RING[1]),
    rim: createRadialRingGeometry(L.RIM_INNER, L.RIM_OUTER),
    lipCap: new THREE.TorusGeometry(L.LIP_CAP.radius, L.LIP_CAP.tube, 10, L.SEGMENTS),
    outerCap: new THREE.TorusGeometry(L.OUTER_CAP.radius, L.OUTER_CAP.tube, 10, L.SEGMENTS),
    armrestCap: new THREE.TorusGeometry(L.ARMREST_CAP.radius, L.ARMREST_CAP.tube, 16, L.SEGMENTS),
  };
  return shared;
}

/** Same angle origin as TABLE_RIM_DECOR: rim angle 0 faces the local player (+z). */
const RIM_ANGLE_ORIGIN = Math.PI / 2;

export interface RimFrame {
  position: [number, number, number];
  /** Y rotation that points local +z radially outward (away from the table centre) */
  rotationY: number;
}

/** Local frame on the table at a rim angle (degrees): +z outward, +x along the rim. */
export function rimFrame(angleDeg: number, radius: number, y = 0): RimFrame {
  const angle = RIM_ANGLE_ORIGIN + (angleDeg * Math.PI) / 180;
  return {
    position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    rotationY: Math.PI / 2 - angle,
  };
}
