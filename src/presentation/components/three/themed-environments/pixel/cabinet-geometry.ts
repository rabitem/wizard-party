import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PIXEL_BUTTON_COLORS, PIXEL_CABINET as CAB, PIXEL_COLORS, type CabinetPlacement } from '@/presentation/config/pixel-environment.config';
import type { Vec3 } from '@/presentation/config/themed-environment.config';
import { localMatrix, placementMatrix } from '../primitives';

/**
 * Low-poly arcade cabinet (origin at floor centre, facing +z): a tinted body
 * (base, tilted control deck, screen housing, side cheeks, marquee box), a
 * dark trim mesh, plus small unlit details (buttons, joystick ball, coin slot)
 * built as per-instance matrices for one instanced draw call.
 */

type BoxPart = { size: Vec3; position: Vec3; rotationX?: number };

/** Control deck tilt (front edge lower) */
const DECK_TILT = 0.28;
const DECK_CENTER: Vec3 = [0, 1.98, 0.42];
const DECK_TOP = DECK_CENTER[1] + 0.12;

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

/** Tinted shell: per-instance colour gives each cabinet its side art colour. */
export function createCabinetBodyGeometry(): THREE.BufferGeometry {
  const w = CAB.WIDTH;
  const half = w / 2;
  return mergeBoxes([
    { size: [w, 1.85, CAB.DEPTH], position: [0, 0.925, 0] },
    { size: [w, 0.22, 0.62], position: DECK_CENTER, rotationX: DECK_TILT },
    { size: [w - 0.2, 1.75, 0.9], position: [0, 2.95, -0.2] },
    { size: [0.1, 2.25, CAB.DEPTH], position: [-half + 0.05, 3.0, 0] },
    { size: [0.1, 2.25, CAB.DEPTH], position: [half - 0.05, 3.0, 0] },
    { size: [w, 0.55, 1.2], position: [0, 4.05, -0.05] },
  ]);
}

/** Dark trim: screen bezel, kick plate, deck top, marquee lip and joystick shaft. */
export function createCabinetTrimGeometry(): THREE.BufferGeometry {
  const [sw, sh] = CAB.SCREEN_SIZE;
  const [sx, sy, sz] = CAB.SCREEN_CENTER;
  return mergeBoxes([
    { size: [sw + 0.14, sh + 0.14, 0.04], position: [sx, sy, sz - 0.03], rotationX: CAB.SCREEN_TILT },
    { size: [CAB.WIDTH + 0.02, 0.2, CAB.DEPTH + 0.02], position: [0, 0.1, 0] },
    { size: [CAB.WIDTH - 0.1, 0.03, 0.56], position: [0, DECK_TOP, DECK_CENTER[2]], rotationX: DECK_TILT },
    { size: [CAB.WIDTH + 0.04, 0.06, 1.24], position: [0, 3.76, -0.05] },
    { size: [0.035, 0.16, 0.035], position: [-0.45, DECK_TOP + 0.08, 0.44] },
  ]);
}

/** Local transforms of the screen and marquee planes */
export const CABINET_SCREEN_OFFSET = localMatrix(CAB.SCREEN_CENTER, [CAB.SCREEN_TILT, 0, 0]);
export const CABINET_MARQUEE_OFFSET = localMatrix(CAB.MARQUEE_CENTER);

interface Detail {
  position: Vec3;
  size: Vec3;
  color: string;
  /** Sits on the tilted control deck */
  onDeck: boolean;
}

const CABINET_DETAILS: readonly Detail[] = [
  { position: [-0.45, DECK_TOP + 0.18, 0.44], size: [0.11, 0.11, 0.11], color: PIXEL_COLORS.joystickBall, onDeck: true },
  ...PIXEL_BUTTON_COLORS.map((color, i): Detail => ({
    position: [0.05 + i * 0.24, DECK_TOP + 0.02, 0.4 - i * 0.02],
    size: [0.1, 0.05, 0.1],
    color,
    onDeck: true,
  })),
  { position: [0, 1.25, CAB.DEPTH / 2 + 0.01], size: [0.16, 0.24, 0.02], color: PIXEL_COLORS.coinSlot, onDeck: false },
];

const scratch = new THREE.Matrix4();

/** World matrices + colours for every small detail of every cabinet */
export function buildCabinetDetails(cabinets: readonly CabinetPlacement[]): { matrices: THREE.Matrix4[]; colors: string[] } {
  const locals = CABINET_DETAILS.map((d) => localMatrix(d.position, [d.onDeck ? DECK_TILT : 0, 0, 0], d.size));
  const matrices: THREE.Matrix4[] = [];
  const colors: string[] = [];
  for (const cabinet of cabinets) {
    placementMatrix({ position: cabinet.position, rotationY: cabinet.rotationY }, scratch);
    CABINET_DETAILS.forEach((detail, i) => {
      matrices.push(scratch.clone().multiply(locals[i]));
      colors.push(detail.color);
    });
  }
  return { matrices, colors };
}

/** World position just in front of a cabinet screen (for glow halos) */
export function screenGlowPosition(cabinet: CabinetPlacement, forward: number): Vec3 {
  const [x, y, z] = cabinet.position;
  const [, sy, sz] = CAB.SCREEN_CENTER;
  const reach = sz + forward;
  return [x + Math.sin(cabinet.rotationY) * reach, y + sy, z + Math.cos(cabinet.rotationY) * reach];
}
