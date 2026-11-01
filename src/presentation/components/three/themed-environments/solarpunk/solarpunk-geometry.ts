import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Procedural low-poly geometry for the solarpunk greenhouse. Builders return
 * fresh resources; components memoise and dispose them. Leaves are built in
 * the XY plane with their base at the origin, pointing +Y. Fronds and
 * monstera leaves are then turned to the ZY plane and curl towards +X, so a
 * placement leans them outward with `tilt: [0, -lean]` and fans them with
 * `rotationY`.
 */

export const POT = { RADIUS: 0.42, HEIGHT: 0.62, SOIL_Y: 0.55 } as const;
export const BASKET = { RADIUS: 0.42, DEPTH: 0.36 } as const;
export const WING = { SPAN: 0.17, LENGTH: 0.14 } as const;
const LEAF_SEGMENTS = 6;
const FROND_TEETH = 9;
const FROND_ARCH = 0.55;

/** Pointed elliptical leaf (vines, climbers, succulents). */
export function createLeafGeometry(length = 0.2, width = 0.11): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(width * 0.75, length * 0.35, 0, length);
  shape.quadraticCurveTo(-width * 0.75, length * 0.35, 0, 0);
  return new THREE.ShapeGeometry(shape, LEAF_SEGMENTS);
}

/**
 * Fern frond: a long tapering blade with saw-tooth leaflets, unit length,
 * bent backwards so instanced fronds arch outward when tilted.
 */
export function createFrondGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0.015, 0);
  for (let i = 0; i < FROND_TEETH; i++) {
    const t0 = (i + 0.15) / FROND_TEETH;
    const t1 = (i + 0.85) / FROND_TEETH;
    const reach = 0.13 * Math.sin(Math.PI * Math.min(1, t1 * 1.1)) + 0.01;
    shape.lineTo(reach, t0 + 0.05);
    shape.lineTo(0.02 * (1 - t1), t1);
  }
  shape.lineTo(0, 1);
  for (let i = FROND_TEETH - 1; i >= 0; i--) {
    const t0 = (i + 0.15) / FROND_TEETH;
    const t1 = (i + 0.85) / FROND_TEETH;
    const reach = 0.13 * Math.sin(Math.PI * Math.min(1, t1 * 1.1)) + 0.01;
    shape.lineTo(-0.02 * (1 - t1), t1);
    shape.lineTo(-reach, t0 + 0.05);
  }
  shape.lineTo(-0.015, 0);
  const geometry = new THREE.ShapeGeometry(shape, 1);
  bendBackwards(geometry, FROND_ARCH);
  return geometry;
}

/** Monstera: broad heart-shaped leaf with oval fenestrations, unit length. */
export function createMonsteraLeafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.08);
  shape.bezierCurveTo(0.22, -0.06, 0.52, 0.18, 0.48, 0.5);
  shape.bezierCurveTo(0.44, 0.78, 0.18, 0.96, 0, 1);
  shape.bezierCurveTo(-0.18, 0.96, -0.44, 0.78, -0.48, 0.5);
  shape.bezierCurveTo(-0.52, 0.18, -0.22, -0.06, 0, 0.08);
  const holes: Array<[number, number, number, number]> = [
    [0.22, 0.34, 0.07, 0.035],
    [0.28, 0.58, 0.07, 0.03],
    [-0.22, 0.4, 0.07, 0.035],
    [-0.26, 0.64, 0.06, 0.03],
    [0.14, 0.78, 0.05, 0.025],
  ];
  for (const [x, y, rx, ry] of holes) {
    const hole = new THREE.Path();
    hole.absellipse(x, y, rx, ry, 0, Math.PI * 2, false, Math.atan2(y - 0.1, x) * 0.6);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ShapeGeometry(shape, 6);
  bendBackwards(geometry, 0.25);
  return geometry;
}

/** Curls a +Y leaf quadratically along its length, then faces it so the curl points +X. */
function bendBackwards(geometry: THREE.BufferGeometry, amount: number): void {
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    position.setZ(i, -amount * y * y);
  }
  geometry.rotateY(-Math.PI / 2);
  geometry.computeVertexNormals();
}

/** Rounded ceramic planter, base at y = 0. */
export function createPotGeometry(): THREE.BufferGeometry {
  const { RADIUS: r, HEIGHT: h } = POT;
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(r * 0.68, 0),
    new THREE.Vector2(r * 0.86, h * 0.2),
    new THREE.Vector2(r, h * 0.82),
    new THREE.Vector2(r * 1.06, h * 0.9),
    new THREE.Vector2(r * 1.06, h),
    new THREE.Vector2(r * 0.94, h),
    new THREE.Vector2(r * 0.9, h * 0.88),
  ];
  return new THREE.LatheGeometry(points, 12);
}

/** Hanging basket bowl, rim at y = 0 hanging below. */
export function createBasketGeometry(): THREE.BufferGeometry {
  const { RADIUS: r, DEPTH: d } = BASKET;
  const points = [
    new THREE.Vector2(0, -d),
    new THREE.Vector2(r * 0.55, -d * 0.92),
    new THREE.Vector2(r * 0.9, -d * 0.55),
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.94, 0.02),
  ];
  return new THREE.LatheGeometry(points, 10);
}

/** Butterfly wing in the XZ plane, attached to the body at x = 0. */
export function createWingGeometry(): THREE.BufferGeometry {
  const { SPAN: s, LENGTH: l } = WING;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(s * 0.4, l * 0.9, s * 1.1, l * 0.7, s, l * 0.1);
  shape.bezierCurveTo(s * 0.9, -l * 0.3, s * 0.6, -l * 0.7, s * 0.35, -l * 0.55);
  shape.quadraticCurveTo(s * 0.15, -l * 0.3, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 4);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Three-blade rotor with a nose hub, facing +Z and spinning around Z. */
export function createRotorGeometry(bladeLength: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.BoxGeometry(bladeLength * 0.09, bladeLength, bladeLength * 0.025);
    // Taper the tip so blades read as aerofoils rather than planks.
    const position = blade.attributes.position;
    for (let v = 0; v < position.count; v++) {
      if (position.getY(v) > 0) position.setX(v, position.getX(v) * 0.35);
    }
    blade.translate(0, bladeLength / 2, 0);
    blade.rotateZ((i * Math.PI * 2) / 3);
    parts.push(blade);
  }
  const hub = new THREE.ConeGeometry(bladeLength * 0.09, bladeLength * 0.22, 8);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, bladeLength * 0.08);
  parts.push(hub.toNonIndexed());
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part))) ?? new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** Slender tapered tower of unit height, base at y = 0. */
export function createTowerGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(0.07, 0.16, 1, 8, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

/** Lily pad: flat disc with the classic notch, lying in the XZ plane. */
export function createLilyPadGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.CircleGeometry(0.22, 12, 0.35, Math.PI * 2 - 0.7);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Lotus bloom: two rings of pointed petals opening upward. */
export function createLotusGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rings: Array<[number, number, number]> = [
    [8, 0.75, 0],
    [6, 0.4, 0.3],
  ];
  for (const [count, tilt, offset] of rings) {
    for (let i = 0; i < count; i++) {
      const petal = createLeafGeometry(0.14, 0.08);
      petal.rotateX(-tilt);
      petal.rotateY(((i + offset) / count) * Math.PI * 2);
      parts.push(petal.toNonIndexed());
      petal.dispose();
    }
  }
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Succulent rosette: three rings of fat upturned leaves. */
export function createRosetteGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const rings: Array<[number, number, number]> = [
    [7, 1.25, 1],
    [6, 0.85, 0.8],
    [5, 0.45, 0.6],
  ];
  rings.forEach(([count, tilt, size], ring) => {
    for (let i = 0; i < count; i++) {
      const leaf = createLeafGeometry(0.5 * size, 0.32 * size);
      leaf.rotateX(-tilt);
      leaf.rotateY(((i + ring * 0.5) / count) * Math.PI * 2);
      parts.push(leaf.toNonIndexed());
      leaf.dispose();
    }
  });
  const merged = mergeGeometries(parts) ?? new THREE.BufferGeometry();
  parts.forEach((part) => part.dispose());
  merged.computeVertexNormals();
  return merged;
}
