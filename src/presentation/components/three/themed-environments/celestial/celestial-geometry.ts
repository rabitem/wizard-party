import * as THREE from 'three';
import { CELESTIAL_CONSTELLATIONS, CELESTIAL_DOME, CELESTIAL_REALISM } from '@/presentation/config/celestial-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { localMatrix, placementMatrix, type PropPlacement } from '../primitives';

const DEG = Math.PI / 180;

/** Point on the (squashed) dome for an azimuth / elevation in degrees, relative to the dome base centre. */
export function domePoint(azimuthDeg: number, elevationDeg: number, radius: number): THREE.Vector3 {
  const az = azimuthDeg * DEG;
  const el = elevationDeg * DEG;
  return new THREE.Vector3(
    Math.cos(el) * Math.cos(az) * radius,
    Math.sin(el) * radius * CELESTIAL_DOME.Y_SCALE,
    Math.cos(el) * Math.sin(az) * radius,
  );
}

/** Line segments + star points for every constellation, built once. */
export function createConstellationGeometries(): { lines: THREE.BufferGeometry; stars: THREE.BufferGeometry } {
  const radius = CELESTIAL_DOME.RADIUS - CELESTIAL_DOME.CONSTELLATION_INSET;
  const linePositions: number[] = [];
  const starPositions: number[] = [];
  for (const constellation of CELESTIAL_CONSTELLATIONS) {
    const points = constellation.stars.map(([az, el]) => domePoint(az, el, radius));
    points.forEach((p) => starPositions.push(p.x, p.y, p.z));
    for (const [a, b] of constellation.lines) {
      linePositions.push(points[a].x, points[a].y, points[a].z, points[b].x, points[b].y, points[b].z);
    }
  }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const stars = new THREE.BufferGeometry();
  stars.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  return { lines, stars };
}

/** Upper half of a sphere, open at the bottom, for the dome. */
export function createDomeGeometry(): THREE.BufferGeometry {
  const { RADIUS, SEGMENTS } = CELESTIAL_DOME;
  return new THREE.SphereGeometry(RADIUS, SEGMENTS, SEGMENTS / 3, 0, Math.PI * 2, 0, Math.PI / 2);
}

/** Flat ceiling slab with a round opening for the dome. */
export function createCeilingRingGeometry(halfWidth: number, halfDepth: number, holeRadius: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, -halfDepth);
  shape.lineTo(halfWidth, -halfDepth);
  shape.lineTo(halfWidth, halfDepth);
  shape.lineTo(-halfWidth, halfDepth);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 32);
}

/** Matrices for the gilded dome ribs (semicircular arcs squashed to the dome). */
export function createRibMatrices(count: number, baseY: number): THREE.Matrix4[] {
  const squash = new THREE.Matrix4().compose(
    new THREE.Vector3(0, baseY, 0),
    new THREE.Quaternion(),
    new THREE.Vector3(1, CELESTIAL_DOME.Y_SCALE, 1),
  );
  // Ribs are half-arcs (PI), so count/2 rotations cover the full circle.
  return Array.from({ length: count / 2 }, (_, i) =>
    squash.clone().multiply(localMatrix([0, 0, 0], [0, (i / (count / 2)) * Math.PI, 0])),
  );
}

/** World matrix for a sub-part of a placed prop. */
export function composePart(parent: PropPlacement, position: Vec3, rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): THREE.Matrix4 {
  return placementMatrix(parent).multiply(localMatrix(position, rotation, scale));
}

/** Small faceted star crystal (stretched octahedron) for rim decor and stardust. */
export function createStarCrystalGeometry(radius: number): THREE.BufferGeometry {
  const geometry = new THREE.OctahedronGeometry(radius, 0);
  geometry.scale(0.7, 1.2, 0.7);
  return geometry;
}

// =============================================================================
// SKY DIRECTIONS (SphereGeometry convention, so stars line up with the painted dome)
// =============================================================================
/** Sky canvas coordinates for a unit direction: u = azimuth 0..1, t = 0 at the apex .. 1 at the rim. */
export function directionToSkyUv(direction: THREE.Vector3): [number, number] {
  const phi = Math.atan2(direction.z, -direction.x);
  const u = (phi < 0 ? phi + Math.PI * 2 : phi) / (Math.PI * 2);
  const t = Math.acos(THREE.MathUtils.clamp(direction.y, -1, 1)) / (Math.PI / 2);
  return [u, t];
}

export interface MilkyWayBasis {
  normal: THREE.Vector3;
  u: THREE.Vector3;
  v: THREE.Vector3;
}

/** Orthonormal basis of the tilted milky-way great circle. */
export function getMilkyWayBasis(): MilkyWayBasis {
  const { TILT, AZIMUTH } = CELESTIAL_REALISM.MILKY_WAY;
  const normal = new THREE.Vector3(Math.sin(TILT) * Math.cos(AZIMUTH), Math.cos(TILT), Math.sin(TILT) * Math.sin(AZIMUTH));
  const u = new THREE.Vector3(-Math.sin(AZIMUTH), 0, Math.cos(AZIMUTH));
  const v = new THREE.Vector3().crossVectors(normal, u).normalize();
  return { normal, u, v };
}

/** Unit direction on the band at `angle` around the circle, pushed `offset` (radians, approx.) off its centre line. */
export function milkyWayPoint(basis: MilkyWayBasis, angle: number, offset: number, target = new THREE.Vector3()): THREE.Vector3 {
  return target
    .copy(basis.u)
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(basis.v, Math.sin(angle))
    .addScaledVector(basis.normal, offset)
    .normalize();
}
