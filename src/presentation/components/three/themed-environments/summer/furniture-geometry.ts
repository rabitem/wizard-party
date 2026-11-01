import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merged low-poly geometry for the terrace furniture. Loungers face -z
 * (feet towards the sea) with the backrest raised at +z; origin on the deck.
 */

type BoxPart = { size: [number, number, number]; position: [number, number, number]; rotationX?: number };

export const LOUNGER = { WIDTH: 0.66, LENGTH: 1.9, SEAT_Y: 0.34, BACK_TILT: -0.65 } as const;
export const UMBRELLA = { POLE_HEIGHT: 2.5, POLE_RADIUS: 0.035, CANOPY_RADIUS: 1.65, CANOPY_HEIGHT: 0.55, BASE_RADIUS: 0.28 } as const;
export const TIKI = { HEIGHT: 1.9, POLE_RADIUS: 0.04, HEAD_RADIUS: 0.09, HEAD_HEIGHT: 0.26 } as const;

function mergeBoxes(parts: readonly BoxPart[]): THREE.BufferGeometry {
  const boxes = parts.map(({ size, position, rotationX = 0 }) => {
    const box = new THREE.BoxGeometry(...size);
    box.rotateX(rotationX);
    box.translate(...position);
    return box;
  });
  const merged = mergeGeometries(boxes) ?? new THREE.BufferGeometry();
  boxes.forEach((box) => box.dispose());
  return merged;
}

/** Lounger frame: side rails, legs and a backrest support. */
export function createLoungerFrameGeometry(): THREE.BufferGeometry {
  const halfW = LOUNGER.WIDTH / 2;
  const rail = 0.05;
  const parts: BoxPart[] = [
    { size: [rail, rail, LOUNGER.LENGTH], position: [-halfW, LOUNGER.SEAT_Y - 0.04, 0] },
    { size: [rail, rail, LOUNGER.LENGTH], position: [halfW, LOUNGER.SEAT_Y - 0.04, 0] },
  ];
  [-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => parts.push({ size: [rail, LOUNGER.SEAT_Y, rail], position: [sx * halfW, LOUNGER.SEAT_Y / 2 - 0.02, sz * LOUNGER.LENGTH * 0.44] })),
  );
  parts.push({ size: [LOUNGER.WIDTH, rail, rail], position: [0, LOUNGER.SEAT_Y + 0.22, LOUNGER.LENGTH * 0.42] });
  return mergeBoxes(parts);
}

/** Lounger fabric: flat seat, raised backrest and a pillow. */
export function createLoungerFabricGeometry(): THREE.BufferGeometry {
  const fabricW = LOUNGER.WIDTH - 0.06;
  return mergeBoxes([
    { size: [fabricW, 0.05, LOUNGER.LENGTH * 0.62], position: [0, LOUNGER.SEAT_Y, -LOUNGER.LENGTH * 0.17] },
    { size: [fabricW, 0.05, LOUNGER.LENGTH * 0.4], position: [0, LOUNGER.SEAT_Y + 0.22, LOUNGER.LENGTH * 0.3], rotationX: LOUNGER.BACK_TILT },
    { size: [fabricW * 0.8, 0.09, 0.22], position: [0, LOUNGER.SEAT_Y + 0.43, LOUNGER.LENGTH * 0.42], rotationX: LOUNGER.BACK_TILT },
  ]);
}

/** Open cone canopy (uv u wraps around, so a stripe texture makes segments). */
export function createCanopyGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.ConeGeometry(UMBRELLA.CANOPY_RADIUS, UMBRELLA.CANOPY_HEIGHT, 16, 1, true);
  geometry.translate(0, UMBRELLA.POLE_HEIGHT - UMBRELLA.CANOPY_HEIGHT / 2 + 0.05, 0);
  return geometry;
}

/** Tiki torch pole with a woven head, base at y = 0. */
export function createTikiPoleGeometry(): THREE.BufferGeometry {
  const pole = new THREE.CylinderGeometry(TIKI.POLE_RADIUS, TIKI.POLE_RADIUS * 1.2, TIKI.HEIGHT, 6);
  pole.translate(0, TIKI.HEIGHT / 2, 0);
  return pole;
}

export function createTikiHeadGeometry(): THREE.BufferGeometry {
  const head = new THREE.CylinderGeometry(TIKI.HEAD_RADIUS, TIKI.HEAD_RADIUS * 0.7, TIKI.HEAD_HEIGHT, 7);
  head.translate(0, TIKI.HEIGHT + TIKI.HEAD_HEIGHT / 2, 0);
  return head;
}
