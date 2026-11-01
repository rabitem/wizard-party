import * as THREE from 'three';

/**
 * Procedural geometry for the Autumn Harvest props. All builders return
 * fresh geometries; components memoise and dispose them.
 */

export const HAY_BALE = { WIDTH: 1.3, HEIGHT: 0.6, DEPTH: 0.7 } as const;
export const CRATE = { WIDTH: 1.0, HEIGHT: 0.6, DEPTH: 0.7, SLAT: 0.05 } as const;
export const LANTERN = { WIDTH: 0.22, HEIGHT: 0.34, CAP: 0.07, POST: 0.025 } as const;

/** Maple-ish leaf in the XZ plane (flat), centred on its stem base. */
export function createLeafGeometry(size = 0.18): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const lobes = 5;
  shape.moveTo(0, 0);
  for (let i = 0; i <= lobes; i++) {
    const angle = Math.PI * 0.1 + (i / lobes) * Math.PI * 0.8;
    const tipRadius = i % 2 === 0 ? size : size * 0.8;
    const notchAngle = angle - Math.PI * 0.08;
    if (i > 0) shape.lineTo(Math.cos(notchAngle) * size * 0.45, Math.sin(notchAngle) * size * 0.45);
    shape.lineTo(Math.cos(angle) * tipRadius, Math.sin(angle) * tipRadius);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 1);
  geometry.translate(0, -size * 0.35, 0);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Hay bale: slightly rounded box (bevelled via extrusion), base at y = 0. */
export function createHayBaleGeometry(): THREE.BufferGeometry {
  const { WIDTH, HEIGHT, DEPTH } = HAY_BALE;
  const bevel = 0.06;
  const shape = new THREE.Shape();
  shape.moveTo(-DEPTH / 2 + bevel, 0);
  shape.lineTo(DEPTH / 2 - bevel, 0);
  shape.quadraticCurveTo(DEPTH / 2, 0, DEPTH / 2, bevel);
  shape.lineTo(DEPTH / 2, HEIGHT - bevel);
  shape.quadraticCurveTo(DEPTH / 2, HEIGHT, DEPTH / 2 - bevel, HEIGHT);
  shape.lineTo(-DEPTH / 2 + bevel, HEIGHT);
  shape.quadraticCurveTo(-DEPTH / 2, HEIGHT, -DEPTH / 2, HEIGHT - bevel);
  shape.lineTo(-DEPTH / 2, bevel);
  shape.quadraticCurveTo(-DEPTH / 2, 0, -DEPTH / 2 + bevel, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WIDTH, bevelEnabled: false, curveSegments: 3 });
  geometry.translate(0, 0, -WIDTH / 2);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

/** Two twine bands wrapped around a bale (thin boxes merged). */
export function createTwineGeometry(): THREE.BufferGeometry {
  const { WIDTH, HEIGHT, DEPTH } = HAY_BALE;
  const band = new THREE.BoxGeometry(0.035, HEIGHT + 0.02, DEPTH + 0.02);
  band.translate(0, HEIGHT / 2, 0);
  const left = band.clone();
  left.translate(-WIDTH * 0.25, 0, 0);
  band.translate(WIDTH * 0.25, 0, 0);
  const merged = mergeSimple([left, band]);
  left.dispose();
  band.dispose();
  return merged;
}

/** Open-top slatted crate made from merged boxes, base at y = 0. */
export function createCrateGeometry(): THREE.BufferGeometry {
  const { WIDTH, HEIGHT, DEPTH, SLAT } = CRATE;
  const parts: THREE.BufferGeometry[] = [];
  const slats = 3;
  const slatHeight = HEIGHT / slats - 0.03;
  for (let i = 0; i < slats; i++) {
    const y = (i + 0.5) * (HEIGHT / slats);
    for (const side of [-1, 1]) {
      const long = new THREE.BoxGeometry(WIDTH, slatHeight, SLAT);
      long.translate(0, y, side * (DEPTH / 2 - SLAT / 2));
      const short = new THREE.BoxGeometry(SLAT, slatHeight, DEPTH);
      short.translate(side * (WIDTH / 2 - SLAT / 2), y, 0);
      parts.push(long, short);
    }
  }
  const bottom = new THREE.BoxGeometry(WIDTH, SLAT, DEPTH);
  bottom.translate(0, SLAT / 2, 0);
  parts.push(bottom);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const post = new THREE.BoxGeometry(SLAT * 1.6, HEIGHT, SLAT * 1.6);
      post.translate(x * (WIDTH / 2 - SLAT), HEIGHT / 2, z * (DEPTH / 2 - SLAT));
      parts.push(post);
    }
  }
  const merged = mergeSimple(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Lantern frame: cap, base and four corner posts merged; base at y = 0. */
export function createLanternFrameGeometry(): THREE.BufferGeometry {
  const { WIDTH, HEIGHT, CAP, POST } = LANTERN;
  const base = new THREE.BoxGeometry(WIDTH + 0.04, 0.04, WIDTH + 0.04);
  base.translate(0, 0.02, 0);
  const cap = new THREE.ConeGeometry(WIDTH * 0.8, CAP * 1.6, 4);
  cap.rotateY(Math.PI / 4);
  cap.translate(0, HEIGHT + CAP * 0.8, 0);
  const ring = new THREE.TorusGeometry(0.04, 0.008, 4, 10);
  ring.translate(0, HEIGHT + CAP * 1.9, 0);
  const parts: THREE.BufferGeometry[] = [base, cap, ring];
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const post = new THREE.BoxGeometry(POST, HEIGHT, POST);
      post.translate((x * WIDTH) / 2, HEIGHT / 2, (z * WIDTH) / 2);
      parts.push(post);
    }
  }
  const merged = mergeSimple(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Glowing lantern glass core; base at y = 0. */
export function createLanternGlassGeometry(): THREE.BufferGeometry {
  const { WIDTH, HEIGHT } = LANTERN;
  const glass = new THREE.BoxGeometry(WIDTH * 0.92, HEIGHT * 0.86, WIDTH * 0.92);
  glass.translate(0, HEIGHT / 2 + 0.02, 0);
  return glass;
}

/** Acorn nut and cap, base at y = 0. */
export function createAcornGeometries() {
  const nut = new THREE.SphereGeometry(0.03, 10, 8);
  nut.scale(1, 1.3, 1);
  nut.translate(0, 0.036, 0);
  const cap = new THREE.SphereGeometry(0.033, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.scale(1, 0.7, 1);
  cap.translate(0, 0.058, 0);
  return { nut, cap };
}

/** Bundle of corn stalks as a tall, splayed cone, base at y = 0. */
export function createCornShockGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ConeGeometry(0.55, 2.4, 9, 4, true);
  geometry.translate(0, 1.2, 0);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const wobble = 1 + Math.sin(i * 1.7) * 0.12;
    position.setX(i, position.getX(i) * wobble);
    position.setZ(i, position.getZ(i) * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Minimal merge for non-indexed/indexed geometries that share the same
 * attribute layout (position, normal, uv). Avoids pulling in addons.
 */
function mergeSimple(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = ['position', 'normal', 'uv'] as const;
  const merged = new THREE.BufferGeometry();
  for (const name of names) {
    const itemSize = parts[0].getAttribute(name).itemSize;
    const total = parts.reduce((sum, g) => sum + g.getAttribute(name).array.length, 0);
    const array = new Float32Array(total);
    let offset = 0;
    for (const part of parts) {
      const source = part.getAttribute(name).array as ArrayLike<number>;
      array.set(source, offset);
      offset += source.length;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  parts.forEach((part, i) => {
    if (part !== geometries[i]) part.dispose();
  });
  merged.computeBoundingSphere();
  return merged;
}
