import * as THREE from 'three';

/**
 * Procedural pumpkin geometry: a squashed lathe profile with vertical ribs
 * pressed in, plus a carved jack-o'-lantern face that hugs the front surface.
 * Built once and shared by every pumpkin/gourd instance.
 */

export const PUMPKIN_SHAPE = {
  RADIUS: 0.5,
  HEIGHT: 0.72,
  RIBS: 8,
  RIB_DEPTH: 0.09,
  PROFILE_STEPS: 14,
  RADIAL_SEGMENTS: 40,
  STEM_HEIGHT: 0.18,
  STEM_RADIUS: 0.05,
  /** Face sits this far proud of the skin to avoid z-fighting */
  FACE_LIFT: 0.012,
} as const;

let pumpkinGeometry: THREE.BufferGeometry | null = null;
let stemGeometry: THREE.BufferGeometry | null = null;
let faceGeometry: THREE.BufferGeometry | null = null;

function buildProfile(): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const { RADIUS, HEIGHT, PROFILE_STEPS } = PUMPKIN_SHAPE;
  for (let i = 0; i <= PROFILE_STEPS; i++) {
    const t = i / PROFILE_STEPS;
    const angle = -Math.PI / 2 + t * Math.PI;
    // Slight dimple at the top and bottom like a real pumpkin.
    const dimple = 1 - 0.18 * Math.pow(Math.abs(Math.sin(angle)), 8);
    const radius = Math.max(0.001, Math.cos(angle) * RADIUS * dimple);
    const y = (Math.sin(angle) * HEIGHT) / 2 * (1 - 0.08 * Math.pow(Math.cos(angle), 2));
    points.push(new THREE.Vector2(radius, y + HEIGHT / 2));
  }
  return points;
}

/** Ribbed pumpkin body, base at y = 0. */
export function getPumpkinGeometry(): THREE.BufferGeometry {
  if (pumpkinGeometry) return pumpkinGeometry;
  const geometry = new THREE.LatheGeometry(buildProfile(), PUMPKIN_SHAPE.RADIAL_SEGMENTS);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const halfRibs = PUMPKIN_SHAPE.RIBS / 2;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const groove = Math.pow(1 - Math.abs(Math.sin(angle * halfRibs)), 3);
    const factor = 1 - PUMPKIN_SHAPE.RIB_DEPTH * groove;
    position.setX(i, x * factor);
    position.setZ(i, z * factor);
  }
  geometry.computeVertexNormals();
  pumpkinGeometry = geometry;
  return geometry;
}

/** Curved, tapered stem; base at y = 0. */
export function getStemGeometry(): THREE.BufferGeometry {
  if (stemGeometry) return stemGeometry;
  const { STEM_HEIGHT, STEM_RADIUS } = PUMPKIN_SHAPE;
  const geometry = new THREE.CylinderGeometry(STEM_RADIUS * 0.6, STEM_RADIUS, STEM_HEIGHT, 6, 3);
  geometry.translate(0, STEM_HEIGHT / 2, 0);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const t = position.getY(i) / STEM_HEIGHT;
    position.setX(i, position.getX(i) + t * t * STEM_RADIUS * 1.4);
  }
  geometry.computeVertexNormals();
  stemGeometry = geometry;
  return geometry;
}

function triangle(cx: number, cy: number, w: number, h: number, flip = false): THREE.Shape {
  const shape = new THREE.Shape();
  const dir = flip ? -1 : 1;
  shape.moveTo(cx - w / 2, cy - (dir * h) / 2);
  shape.lineTo(cx + w / 2, cy - (dir * h) / 2);
  shape.lineTo(cx, cy + (dir * h) / 2);
  shape.closePath();
  return shape;
}

function zigzagMouth(width: number, cy: number): THREE.Shape {
  const shape = new THREE.Shape();
  const teeth = 4;
  const half = width / 2;
  shape.moveTo(-half, cy + 0.03);
  for (let i = 1; i <= teeth; i++) {
    const x = -half + (i / teeth) * width;
    shape.lineTo(x - width / teeth / 2, cy + (i % 2 === 0 ? 0.03 : -0.02));
    shape.lineTo(x, cy + 0.03);
  }
  shape.quadraticCurveTo(0, cy - 0.2, -half, cy + 0.03);
  return shape;
}

/** Carved face (eyes, nose, grin) projected onto the pumpkin's front (+z). */
export function getJackFaceGeometry(): THREE.BufferGeometry {
  if (faceGeometry) return faceGeometry;
  const centreY = PUMPKIN_SHAPE.HEIGHT / 2;
  const shapes = [
    triangle(-0.15, 0.1, 0.16, 0.13),
    triangle(0.15, 0.1, 0.16, 0.13),
    triangle(0, -0.0, 0.08, 0.07),
    zigzagMouth(0.42, -0.1),
  ];
  const geometry = new THREE.ShapeGeometry(shapes, 4);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const ry = PUMPKIN_SHAPE.HEIGHT / 2;
  const halfRibs = PUMPKIN_SHAPE.RIBS / 2;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    // Radius of the smooth body at this height, then press in the rib groove
    // at this vertex's angle so the face follows the ribbed skin.
    const ringRadius = PUMPKIN_SHAPE.RADIUS * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2));
    const smoothZ = Math.sqrt(Math.max(0, ringRadius ** 2 - x ** 2));
    const angle = Math.atan2(smoothZ, x);
    const groove = Math.pow(1 - Math.abs(Math.sin(angle * halfRibs)), 3);
    const ribbedRadius = ringRadius * (1 - PUMPKIN_SHAPE.RIB_DEPTH * groove);
    const z = Math.sqrt(Math.max(0, ribbedRadius ** 2 - x ** 2));
    position.setZ(i, z + PUMPKIN_SHAPE.FACE_LIFT);
    position.setY(i, y + centreY);
  }
  geometry.computeVertexNormals();
  faceGeometry = geometry;
  return geometry;
}
