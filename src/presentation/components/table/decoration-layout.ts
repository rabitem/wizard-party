import type { Vector3Tuple } from 'three';
import { TABLE_PHYSICS } from '@/presentation/config/rapier.config';

/** Cylinder sizes of the knockable decorations (visual mesh and collider share them). */
export const DECORATION_SHAPES = {
  CHIP: { RADIUS: 0.08, HEIGHT: 0.02 },
  COASTER: { RADIUS: 0.12, HEIGHT: 0.008 },
} as const;

/** Centre height of a flat coaster resting on the felt, so it starts in contact, not overlapping. */
const COASTER_REST_Y = TABLE_PHYSICS.HEIGHT + DECORATION_SHAPES.COASTER.HEIGHT / 2;

/** One knockable decoration body: where it starts and which way it faces. */
export interface DecorationPlacement {
  key: string;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

export interface ChipPlacement extends DecorationPlacement {
  color: string;
}

interface ChipStack {
  id: string;
  pos: Vector3Tuple;
  chips: { id: string; color: string; height: number }[];
}

const CHIP_STACKS: readonly ChipStack[] = [
  {
    id: 'stack-front-left',
    pos: [-1.5, 0.02, 1.0],
    chips: [
      { id: 'fl-0', color: '#c41e3a', height: 0.01 },
      { id: 'fl-1', color: '#c41e3a', height: 0.035 },
      { id: 'fl-2', color: '#1e90ff', height: 0.06 },
      { id: 'fl-3', color: '#1e90ff', height: 0.085 },
      { id: 'fl-4', color: '#228b22', height: 0.11 },
    ],
  },
  {
    id: 'stack-front-right',
    pos: [1.6, 0.02, 0.9],
    chips: [
      { id: 'fr-0', color: '#1e90ff', height: 0.01 },
      { id: 'fr-1', color: '#1e90ff', height: 0.035 },
      { id: 'fr-2', color: '#1e90ff', height: 0.06 },
      { id: 'fr-3', color: '#ffd700', height: 0.085 },
    ],
  },
  {
    id: 'stack-back-left',
    pos: [-1.4, 0.02, -1.2],
    chips: [
      { id: 'bl-0', color: '#228b22', height: 0.01 },
      { id: 'bl-1', color: '#228b22', height: 0.035 },
      { id: 'bl-2', color: '#c41e3a', height: 0.06 },
    ],
  },
  {
    id: 'stack-back-right',
    pos: [1.5, 0.02, -1.1],
    chips: [
      { id: 'br-0', color: '#ffd700', height: 0.01 },
      { id: 'br-1', color: '#ffd700', height: 0.035 },
      { id: 'br-2', color: '#1e90ff', height: 0.06 },
      { id: 'br-3', color: '#1e90ff', height: 0.085 },
      { id: 'br-4', color: '#c41e3a', height: 0.11 },
      { id: 'br-5', color: '#c41e3a', height: 0.135 },
    ],
  },
];

/** Every chip of every stack, each slightly turned so the stacks look hand-placed. */
export const CHIP_PLACEMENTS: readonly ChipPlacement[] = CHIP_STACKS.flatMap((stack, stackIdx) =>
  stack.chips.map((chip, chipIdx) => ({
    key: chip.id,
    color: chip.color,
    position: [stack.pos[0], stack.pos[1] + chip.height, stack.pos[2]] as Vector3Tuple,
    rotation: [0, (stackIdx * 0.3 + chipIdx * 0.15) % (Math.PI * 2), 0] as Vector3Tuple,
  })),
);

/**
 * Coasters lying flat on the table, each turned about the vertical axis. Three more used to start
 * at radius 3 (left, right, front), on the wood rim beyond the table collider (a 5 x 5 square):
 * they fell through the world within a second of every mount and kept Rapier and the renderer
 * busy forever, so they are gone. The two left used to be pitched -90 degrees about X, which
 * stood the disc on its edge, half sunk into the felt.
 */
export const COASTER_PLACEMENTS: readonly DecorationPlacement[] = [
  { key: 'coaster-front-right', position: [2.1, COASTER_REST_Y, 2.1], rotation: [0, 1.2, 0] },
  { key: 'coaster-front-left', position: [-2.1, COASTER_REST_Y, 2.1], rotation: [0, 1.6, 0] },
];
