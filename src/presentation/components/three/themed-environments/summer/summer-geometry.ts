import * as THREE from 'three';
import { SUMMER_SKY_STOPS } from '@/presentation/config/summer-environment.config';
import { createPaintedTexture, fillVerticalGradient } from '../primitives/canvas-texture';

/**
 * Procedural geometry and textures for the summer terrace. Builders return
 * fresh resources; components memoise and dispose them.
 */

/** Width spans the leaflet tips; the frond texture's alpha cuts the gaps between leaflets. */
export const FROND = { LENGTH: 2.6, WIDTH: 1.0, DROOP: 0.9, SEGMENTS: 8 } as const;
const STRIPE_COUNT = 8;

/**
 * Palm frond along +x: a leaf-shaped strip that tapers at both ends and
 * droops towards the tip, folded slightly along its spine.
 */
export function createFrondGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, FROND.SEGMENTS, 2);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const t = position.getX(i) + 0.5;
    const side = position.getZ(i) * 2;
    const width = Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)) * FROND.WIDTH * 0.5;
    const x = t * FROND.LENGTH;
    const y = -t * t * FROND.DROOP - Math.abs(side) * width * 0.35;
    position.setXYZ(i, x, y, side * width);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Scallop shell: ribbed fan, hinge at the origin, opening towards +z. */
export function createScallopGeometry(size = 0.07): THREE.BufferGeometry {
  const ribs = 9;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= ribs * 2; i++) {
    const angle = Math.PI * 0.18 + (i / (ribs * 2)) * Math.PI * 0.64;
    const radius = size * (i % 2 === 0 ? 1 : 0.93);
    shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.lineTo(0, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: size * 0.12, bevelEnabled: true, bevelSize: size * 0.06, bevelThickness: size * 0.08, bevelSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Conch: lathe spiral silhouette lying along +z. */
export function createConchGeometry(size = 0.1): THREE.BufferGeometry {
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(size * 0.18, size * 0.1),
    new THREE.Vector2(size * 0.42, size * 0.35),
    new THREE.Vector2(size * 0.38, size * 0.55),
    new THREE.Vector2(size * 0.24, size * 0.62),
    new THREE.Vector2(size * 0.2, size * 0.8),
    new THREE.Vector2(size * 0.08, size * 0.95),
    new THREE.Vector2(0, size),
  ];
  const geometry = new THREE.LatheGeometry(points, 8);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Five-armed starfish lying flat. */
export function createStarfishGeometry(size = 0.075): THREE.BufferGeometry {
  const arms = 5;
  const shape = new THREE.Shape();
  for (let i = 0; i <= arms * 2; i++) {
    const angle = (i / (arms * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? size : size * 0.38;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: size * 0.1, bevelEnabled: true, bevelSize: size * 0.08, bevelThickness: size * 0.1, bevelSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Surfboard: flattened, elongated sphere standing on its tail (base at y = 0), deck facing +-x. */
export function createSurfboardGeometry(length = 2.1, width = 0.55): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(0.5, 12, 8);
  geometry.scale(0.07, length, width);
  geometry.translate(0, length / 2, 0);
  return geometry;
}

/** Sunset gradient for the inside of the sky dome (v = 1 at the zenith). */
export function createSkyTexture(): THREE.Texture {
  return createPaintedTexture(8, 256, (ctx, w, h) => fillVerticalGradient(ctx, w, h, SUMMER_SKY_STOPS));
}

/** Alternating vertical stripes; wraps around a cone canopy via its u coordinate. */
export function createStripeTexture(colors: readonly [string, string]): THREE.Texture {
  return createPaintedTexture(128, 8, (ctx, w, h) => {
    const stripe = w / STRIPE_COUNT;
    for (let i = 0; i < STRIPE_COUNT; i++) {
      ctx.fillStyle = colors[i % 2];
      ctx.fillRect(i * stripe, 0, stripe, h);
    }
  });
}
