import * as THREE from 'three';
import { CARD_DIMENSIONS } from '@/presentation/config/card-physics';
import { CARD_EDGE_SWATCH, CARD_FACE_LOGICAL_SIZE } from '@/presentation/config/card-render.config';

/** Material slots of a card mesh: `material={[front, back]}` */
export const CARD_MATERIAL_SLOT = {
  FRONT: 0,
  BACK: 1,
} as const;

/** BoxGeometry face order (one quad of 4 vertices and 6 indices each) */
const BOX_FACE = { PX: 0, NX: 1, PY: 2, NY: 3, PZ: 4, NZ: 5 } as const;
const EDGE_FACES = [BOX_FACE.PX, BOX_FACE.NX, BOX_FACE.PY, BOX_FACE.NY] as const;
const VERTICES_PER_FACE = 4;
const INDICES_PER_FACE = 6;

/** UV of the edge swatch centre in the back texture (canvas y runs down, UV v runs up) */
function getCardEdgeSwatchUv(): [number, number] {
  const half = CARD_EDGE_SWATCH.SIZE_PX / 2;
  return [half / CARD_FACE_LOGICAL_SIZE.WIDTH, 1 - half / CARD_FACE_LOGICAL_SIZE.HEIGHT];
}

function faceIndices(index: ArrayLike<number>, face: number): number[] {
  const start = face * INDICES_PER_FACE;
  return Array.from({ length: INDICES_PER_FACE }, (_, i) => index[start + i]);
}

/**
 * Card box with two draw groups instead of BoxGeometry's six:
 * - BACK slot: the back face plus the four edges, whose UVs all point at the edge swatch of the
 *   back texture (constant UV, so it samples the full-resolution swatch at any distance);
 * - FRONT slot: the face.
 * Back and edges come first so a card drawn without depth test (the local hand) paints its
 * front last.
 */
function createCardGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(CARD_DIMENSIONS.WIDTH, CARD_DIMENSIONS.HEIGHT, CARD_DIMENSIONS.THICKNESS);
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const [swatchU, swatchV] = getCardEdgeSwatchUv();
  for (const face of EDGE_FACES) {
    for (let v = 0; v < VERTICES_PER_FACE; v++) uv.setXY(face * VERTICES_PER_FACE + v, swatchU, swatchV);
  }
  uv.needsUpdate = true;

  const index = geometry.getIndex();
  if (!index) throw new Error('BoxGeometry is expected to be indexed');
  const backAndEdges = [BOX_FACE.NZ, ...EDGE_FACES].flatMap((face) => faceIndices(index.array, face));
  const front = faceIndices(index.array, BOX_FACE.PZ);
  geometry.setIndex([...backAndEdges, ...front]);
  geometry.clearGroups();
  geometry.addGroup(0, backAndEdges.length, CARD_MATERIAL_SLOT.BACK);
  geometry.addGroup(backAndEdges.length, front.length, CARD_MATERIAL_SLOT.FRONT);
  return geometry;
}

let sharedGeometry: THREE.BufferGeometry | null = null;

/**
 * The one card geometry every card mesh shares (hand, dragged, played, collecting, deck).
 * Pass it as a `geometry` prop: R3F never disposes prop objects, and it must not be disposed.
 */
export function getCardGeometry(): THREE.BufferGeometry {
  sharedGeometry ??= createCardGeometry();
  return sharedGeometry;
}
