import * as THREE from 'three';
import { MANGA_COLORS } from '@/presentation/config/manga-environment.config';

/**
 * Shared geometry and cel-shaded materials for the Shonen Ink dojo. Builders
 * return fresh resources; components memoise and dispose them. The toon ramp
 * texture is a tiny module-level singleton shared by every toon material.
 */

/** Three hard light bands give props the flat manga cel look. */
const TOON_STEPS = [96, 176, 255] as const;
let toonRamp: THREE.DataTexture | null = null;

function getToonRamp(): THREE.DataTexture {
  if (toonRamp) return toonRamp;
  toonRamp = new THREE.DataTexture(new Uint8Array(TOON_STEPS), TOON_STEPS.length, 1, THREE.RedFormat);
  toonRamp.minFilter = THREE.NearestFilter;
  toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.generateMipmaps = false;
  toonRamp.needsUpdate = true;
  return toonRamp;
}

/** Cel-shaded material (white base colour lets instances tint it). */
export function createToonMaterial(color: string, options: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: getToonRamp(), ...options });
}

/** Inverted-hull ink outline: draw the back faces of a slightly larger copy. */
export function createInkOutlineMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: MANGA_COLORS.ink, side: THREE.BackSide });
}

/** Per-axis scale that grows a box of the given size by `thickness` on every side. */
export function outlineScale(size: readonly [number, number, number], thickness: number): [number, number, number] {
  return [1 + (2 * thickness) / size[0], 1 + (2 * thickness) / size[1], 1 + (2 * thickness) / size[2]];
}

const UP = new THREE.Vector3(0, 1, 0);

/** Unit-height cylinder matrix spanning two points (radius via the geometry). */
export function segmentMatrix(from: THREE.Vector3, to: THREE.Vector3, radiusScale = 1): THREE.Matrix4 {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize());
  const middle = from.clone().add(to).multiplyScalar(0.5);
  return new THREE.Matrix4().compose(middle, quaternion, new THREE.Vector3(radiusScale, length, radiusScale));
}

/** Ikebana vase: narrow foot, round belly, slim neck. Base at y = 0, height 1. */
export function createVaseGeometry(): THREE.BufferGeometry {
  const profile: Array<[number, number]> = [
    [0, 0], [0.22, 0], [0.26, 0.06], [0.36, 0.3], [0.34, 0.55], [0.16, 0.8], [0.13, 0.92], [0.18, 1], [0.15, 1], [0.1, 0.9],
  ];
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 14);
}

/** Folded paper crane, about 1 unit long (beak along +x), resting at y = 0. */
export function createCraneGeometry(): THREE.BufferGeometry {
  const triangles: number[][] = [
    // neck + head, tail (flat vertical fins)
    [0, 0, 0, 0.14, 0.12, 0, 0.55, 0.48, 0],
    [0.55, 0.48, 0, 0.62, 0.42, 0, 0.5, 0.44, 0],
    [0, 0, 0, -0.14, 0.12, 0, -0.52, 0.36, 0],
    // body keel
    [-0.22, 0.12, 0, 0.22, 0.12, 0, 0, 0, 0.09],
    [0.22, 0.12, 0, -0.22, 0.12, 0, 0, 0, -0.09],
    // wings raised in a shallow V
    [-0.16, 0.13, 0, 0.16, 0.13, 0, -0.04, 0.34, 0.48],
    [0.16, 0.13, 0, -0.16, 0.13, 0, -0.04, 0.34, -0.48],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(triangles.flat(), 3));
  geometry.computeVertexNormals();
  return geometry;
}
