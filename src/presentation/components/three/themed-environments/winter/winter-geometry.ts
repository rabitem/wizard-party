import * as THREE from 'three';

/**
 * Procedural geometry for the winter lodge. Builders return
 * fresh resources; components memoise and dispose them.
 */

export const ICICLE = { RADIUS: 0.05, LENGTH: 0.45 } as const;
export const PINE_CONE = { RADIUS: 0.055, HEIGHT: 0.13, SCALES: 5 } as const;

/** Downward-pointing icicle, hanging from y = 0. */
export function createIcicleGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ConeGeometry(ICICLE.RADIUS, ICICLE.LENGTH, 5);
  geometry.rotateX(Math.PI);
  geometry.translate(0, -ICICLE.LENGTH / 2, 0);
  return geometry;
}

/** Pine cone: lathe with a zig-zag profile so the scales read at small size. Base at y = 0. */
export function createPineConeGeometry(): THREE.BufferGeometry {
  const { RADIUS, HEIGHT, SCALES } = PINE_CONE;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= SCALES * 2; i++) {
    const t = i / (SCALES * 2);
    const envelope = Math.sin(Math.PI * Math.min(1, t * 1.15)) * RADIUS + 0.004;
    const notch = i % 2 === 0 ? 1 : 0.72;
    points.push(new THREE.Vector2(envelope * notch, t * HEIGHT));
  }
  points.push(new THREE.Vector2(0, HEIGHT * 1.02));
  return new THREE.LatheGeometry(points, 7);
}
