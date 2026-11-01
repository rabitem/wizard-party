import * as THREE from 'three';

type Point = readonly [number, number];

const OUTLINE_STEPS = 40;

/** Half-width profile of a leaf along its length (t: 0 stem -> 1 tip). */
function leafHalfWidth(t: number, lobes: number): number {
  const body = 0.34 * Math.pow(Math.sin(Math.PI * t), 0.85);
  if (lobes === 0) return body;
  return body * (0.62 + 0.38 * Math.abs(Math.sin(t * Math.PI * lobes)));
}

/** Closed outline (unit length along +y) of a lobed oak leaf or a plain leaf. */
export function leafOutline(lobes: number): Point[] {
  const right: Point[] = [];
  for (let i = 0; i <= OUTLINE_STEPS; i++) {
    const t = i / OUTLINE_STEPS;
    right.push([leafHalfWidth(t, lobes), t]);
  }
  const left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y] as Point);
  return [...right, ...left];
}

export const OAK_LEAF = leafOutline(4.5);
export const PLAIN_LEAF = leafOutline(0);

/** Traces a leaf outline on a canvas at (x, y) pointing along `rotation`. */
export function traceLeaf(
  ctx: CanvasRenderingContext2D,
  outline: readonly Point[],
  [x, y]: Point,
  size: number,
  rotation: number,
): void {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  ctx.beginPath();
  outline.forEach(([px, py], i) => {
    const lx = px * size;
    const ly = (py - 0.5) * size;
    const wx = x + lx * cos - ly * sin;
    const wy = y + lx * sin + ly * cos;
    if (i === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  });
  ctx.closePath();
}

/**
 * Flat leaf mesh lying in the XZ plane (stem at origin, tip along +z) with a
 * gentle curl so it does not look like a paper cut-out.
 */
export function createLeafGeometry(outline: readonly Point[], curl = 0.12): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ShapeGeometry(shape, 2);
  // Face up (+y) with the tip along +z
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(Math.PI);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    position.setY(i, curl * (x * x * 2.5 + Math.sin(z * Math.PI) * 0.15));
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Five-petal blossom (unit radius) lying in the XZ plane. */
export function createBlossomGeometry(petals = 5): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const steps = petals * 8;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = 0.45 + 0.55 * Math.pow(Math.abs(Math.cos((a * petals) / 2)), 0.6);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
