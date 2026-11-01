import * as THREE from 'three';
import { SPRING_SKY } from '@/presentation/config/spring-environment.config';
import { createPaintedTexture, fillVerticalGradient } from '../primitives/canvas-texture';
import { seededRandom } from '../primitives';

/**
 * Procedural geometry and textures for the spring garden. Builders return
 * fresh resources; components memoise and dispose them.
 */

export const POT = { RADIUS: 0.36, HEIGHT: 0.55, SOIL_Y: 0.48 } as const;
export const FLOWER = { SIZE: 0.075 } as const;
export const WING = { SPAN: 0.16, LENGTH: 0.13 } as const;
const SKY_SIZE = { WIDTH: 512, HEIGHT: 256 } as const;

/** Cherry petal: small teardrop in the XZ plane. */
export function createPetalGeometry(size = 0.07): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -size * 0.5);
  shape.quadraticCurveTo(size * 0.55, -size * 0.1, size * 0.18, size * 0.5);
  shape.lineTo(0, size * 0.38);
  shape.lineTo(-size * 0.18, size * 0.5);
  shape.quadraticCurveTo(-size * 0.55, -size * 0.1, 0, -size * 0.5);
  const geometry = new THREE.ShapeGeometry(shape, 2);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Five-petal flower head (flat star facing up) with a raised centre. */
export function createFlowerHeadGeometry(): THREE.BufferGeometry {
  const petals = 5;
  const shape = new THREE.Shape();
  for (let i = 0; i <= petals * 2; i++) {
    const angle = (i / (petals * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? FLOWER.SIZE : FLOWER.SIZE * 0.45;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Terracotta pot with a rolled rim. Base at y = 0. */
export function createPotGeometry(): THREE.BufferGeometry {
  const { RADIUS, HEIGHT } = POT;
  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(RADIUS * 0.68, 0),
    new THREE.Vector2(RADIUS * 0.9, HEIGHT * 0.8),
    new THREE.Vector2(RADIUS * 1.05, HEIGHT * 0.82),
    new THREE.Vector2(RADIUS * 1.05, HEIGHT),
    new THREE.Vector2(RADIUS * 0.88, HEIGHT),
    new THREE.Vector2(RADIUS * 0.86, POT.SOIL_Y),
    new THREE.Vector2(0, POT.SOIL_Y),
  ];
  return new THREE.LatheGeometry(points, 12);
}

/** One butterfly wing in the XZ plane, hinged at x = 0 and spreading to +x. */
export function createWingGeometry(): THREE.BufferGeometry {
  const { SPAN, LENGTH } = WING;
  const shape = new THREE.Shape();
  shape.moveTo(0, LENGTH * 0.1);
  shape.bezierCurveTo(SPAN * 0.5, LENGTH * 0.9, SPAN * 1.05, LENGTH * 0.55, SPAN * 0.9, 0);
  shape.bezierCurveTo(SPAN * 0.85, -LENGTH * 0.45, SPAN * 0.35, -LENGTH * 0.6, 0, -LENGTH * 0.2);
  shape.lineTo(0, LENGTH * 0.1);
  const geometry = new THREE.ShapeGeometry(shape, 4);
  // Shape +y becomes +z so the larger forewing leads (butterflies fly along +z).
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Dusky garden sky: gradient, low sun, distant tree line and hedges along the bottom. */
export function createSpringSkyTexture(): THREE.Texture {
  return createPaintedTexture(SKY_SIZE.WIDTH, SKY_SIZE.HEIGHT, (ctx, w, h) => {
    const rand = seededRandom(41);
    fillVerticalGradient(ctx, w, h, SPRING_SKY.stops);
    const sun = ctx.createRadialGradient(w * 0.5, h * 0.74, 0, w * 0.5, h * 0.74, h * 0.3);
    sun.addColorStop(0, SPRING_SKY.sun);
    sun.addColorStop(0.2, 'rgba(255,240,200,0.6)');
    sun.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = SPRING_SKY.treeline;
    for (let x = 0; x < w; x += 10 + rand() * 14) {
      const radius = 12 + rand() * 22;
      ctx.beginPath();
      ctx.arc(x, h * 0.8 - rand() * 10, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.fillStyle = SPRING_SKY.hedgeline;
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
  });
}

const GRASS_BLADES = 6;
const GRASS_SEGMENTS = 3;
const GRASS_BASE_SHADE = 0.42;

/**
 * Grass tuft: a fan of tapered, outward-curving blades, unit height with the
 * base at the origin. A vertex colour darkens the roots (ambient occlusion)
 * and is multiplied by the instance colour.
 */
export function createGrassTuftGeometry(): THREE.BufferGeometry {
  const rand = seededRandom(11);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let b = 0; b < GRASS_BLADES; b++) {
    const angle = (b / GRASS_BLADES) * Math.PI * 2 + rand() * 0.6;
    const lean = 0.25 + rand() * 0.35;
    const height = 0.65 + rand() * 0.35;
    const width = 0.05 + rand() * 0.03;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const base = positions.length / 3;
    for (let s = 0; s <= GRASS_SEGMENTS; s++) {
      const t = s / GRASS_SEGMENTS;
      const half = width * (1 - t) * 0.5;
      const out = lean * t * t;
      const cx = dirX * (0.04 + out);
      const cz = dirZ * (0.04 + out);
      const y = height * t;
      // Blade plane is perpendicular to its lean direction.
      positions.push(cx - dirZ * half, y, cz + dirX * half, cx + dirZ * half, y, cz - dirX * half);
      const shade = GRASS_BASE_SHADE + (1 - GRASS_BASE_SHADE) * t;
      colors.push(shade, shade, shade, shade, shade, shade);
      if (s < GRASS_SEGMENTS) {
        const i = base + s * 2;
        indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
