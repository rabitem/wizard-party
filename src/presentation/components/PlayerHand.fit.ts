import type * as THREE from 'three';
import { CARD_DIMENSIONS } from '../config/card-physics';
import { HAND_CONFIG } from '../config/layout.config';

/**
 * Local hand layout: one or more overlapping fanned rows that always fit the screen.
 *
 * Everything is solved in the hand's own plane (CameraRelativeHand: DISTANCE_FROM_CAMERA in
 * front of the camera, camera-aligned), where one unit is a fixed number of CSS pixels for a
 * given viewport height and FOV. Priorities, in order: every card on screen; each overlapped
 * card keeps a tappable strip (MIN_STRIP_PX); cards as large as possible; as few rows as possible.
 */

const { LAYOUT } = HAND_CONFIG;
const DEG_TO_RAD = Math.PI / 180;

export interface HandLayoutResult {
  /** Distance between neighbouring card centres within a row */
  cardSpacing: number;
  cardScale: number;
  /** Spacing the cards would use if there were room (compression indicator) */
  preferredSpacing: number;
  rows: number;
  /** Cards in the fullest row */
  perRow: number;
  /** Vertical distance between rows */
  rowStep: number;
}

export interface HandLayoutOptions {
  /** Touch screen: overlapped cards keep a finger-sized strip */
  coarsePointer?: boolean;
}

/** Primary input is a finger (phones, tablets): overlapped cards need a wider strip */
export function isCoarsePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

/** Preferred card scale, tapering smoothly from few to many cards */
export function getPreferredCardScale(cardCount: number, isPortrait: boolean): number {
  const key = isPortrait ? 'PORTRAIT' : 'LANDSCAPE';
  const { FROM, TO } = LAYOUT.TAPER;
  const t = Math.min(1, Math.max(0, (cardCount - FROM) / (TO - FROM)));
  return LAYOUT.CARD_SCALE[key] + (LAYOUT.DENSE_CARD_SCALE[key] - LAYOUT.CARD_SCALE[key]) * t;
}

/** Horizontal extent of a card rotated by the outermost fan angle, per unit of card scale */
function rotatedWidthPerScale(fanAngle: number): number {
  const half = fanAngle / 2;
  return CARD_DIMENSIONS.WIDTH * Math.cos(half) + CARD_DIMENSIONS.HEIGHT * Math.sin(half);
}

/** CSS px per hand-plane unit (vertical FOV, so it depends on the viewport height only) */
export function getHandPixelsPerUnit(height: number, fovDeg: number): number {
  return height / (2 * HAND_CONFIG.DISTANCE_FROM_CAMERA * Math.tan((fovDeg * DEG_TO_RAD) / 2));
}

interface RowFitInput {
  perRow: number;
  cardCount: number;
  preferredScale: number;
  /** Largest scale the rows may use (multi-row hands stay inside the single-row height band) */
  maxScale: number;
  availableUnits: number;
  minStripUnits: number;
  spacingRatio: number;
}

interface RowFit {
  scale: number;
  spacing: number;
  /** The row meets the minimum strip without shrinking cards below MIN_SCALE_RATIO */
  comfortable: boolean;
}

/**
 * Rows behind the front row add height: a multi-row hand keeps its total height (cards, row
 * steps and arc) inside MAX_HEIGHT_FRACTION of the screen, so it never climbs over the table.
 */
function getMultiRowScaleCap(rows: number, visibleHeightUnits: number): number {
  if (rows <= 1) return Infinity;
  const heightPerScale = CARD_DIMENSIONS.HEIGHT * (1 + (rows - 1) * LAYOUT.ROW_STEP + LAYOUT.ARC_HEIGHT.COMPRESSED);
  return (LAYOUT.MAX_HEIGHT_FRACTION * visibleHeightUnits) / heightPerScale;
}

/** Cards closest to the camera look slightly larger: budget for the deepest card */
function depthMagnification(cardCount: number): number {
  const depth = (cardCount - 1) * LAYOUT.Z_STEP;
  return HAND_CONFIG.DISTANCE_FROM_CAMERA / (HAND_CONFIG.DISTANCE_FROM_CAMERA - depth);
}

function fitRow(input: RowFitInput): RowFit {
  const { perRow, cardCount, preferredScale, maxScale, availableUnits, minStripUnits, spacingRatio } = input;
  // Budget for the nearest card looking slightly larger, and for the left-hand gaps that
  // perspective narrows a little
  const magnification = depthMagnification(cardCount);
  const width = availableUnits / magnification;
  const strip = minStripUnits * magnification;
  const gaps = Math.max(0, perRow - 1);
  const widthPerScale = rotatedWidthPerScale(gaps > 0 ? LAYOUT.FAN_ANGLE.COMPRESSED : 0);
  const preferredSpacing = (scale: number) => CARD_DIMENSIONS.WIDTH * scale * spacingRatio;
  // Preferred spacing, but never below the strip (tiny cards) nor beyond what fits
  const spacingFor = (scale: number) => (gaps === 0
    ? 0
    : Math.min(Math.max(preferredSpacing(scale), strip), (width - widthPerScale * scale) / gaps));

  // Largest scale whose row still leaves the minimum strip per card
  const scaleForStrip = gaps === 0 ? width / widthPerScale : (width - gaps * strip) / widthPerScale;
  const minScale = preferredScale * LAYOUT.MIN_SCALE_RATIO;
  const scale = Math.min(preferredScale, maxScale, scaleForStrip);
  if (scale >= minScale) return { scale, spacing: spacingFor(scale), comfortable: true };

  // Too dense for the strip: smallest allowed cards, spacing whatever still fits on screen
  const fallbackScale = Math.min(minScale, width / widthPerScale);
  return { scale: fallbackScale, spacing: Math.max(0, spacingFor(fallbackScale)), comfortable: false };
}

/**
 * Hand layout for a card count and viewport. The camera supplies the vertical FOV; the hand plane
 * is scaled against camera zoom by CameraRelativeHand, so zoom does not enter here.
 */
export function calcHandLayout(
  cardCount: number,
  camera: THREE.Camera,
  width: number,
  height: number,
  options: HandLayoutOptions = {}
): HandLayoutResult {
  const isPortrait = height > width;
  const key = isPortrait ? 'PORTRAIT' : 'LANDSCAPE';
  const fov = (camera as THREE.PerspectiveCamera).fov || 55;
  const pxPerUnit = getHandPixelsPerUnit(Math.max(1, height), fov);
  const availableUnits = (Math.max(1, width) * LAYOUT.WIDTH_FRACTION[key]) / pxPerUnit;
  const minStripPx = options.coarsePointer ? LAYOUT.MIN_STRIP_PX.COARSE : LAYOUT.MIN_STRIP_PX.FINE;
  const preferredScale = getPreferredCardScale(cardCount, isPortrait);
  const spacingRatio = LAYOUT.SPACING_RATIO[key];
  const count = Math.max(1, cardCount);

  const visibleHeightUnits = Math.max(1, height) / pxPerUnit;
  const fitRows = (rows: number) => fitRow({
    perRow: Math.ceil(count / rows), cardCount: count, preferredScale, maxScale: getMultiRowScaleCap(rows, visibleHeightUnits),
    availableUnits, minStripUnits: minStripPx / pxPerUnit, spacingRatio,
  });
  let rows = 1;
  let fit = fitRows(rows);
  while (!fit.comfortable && rows < Math.min(LAYOUT.MAX_ROWS, count)) {
    rows += 1;
    fit = fitRows(rows);
  }

  return {
    cardSpacing: fit.spacing,
    cardScale: fit.scale,
    preferredSpacing: CARD_DIMENSIONS.WIDTH * fit.scale * spacingRatio,
    rows,
    perRow: Math.ceil(count / rows),
    rowStep: CARD_DIMENSIONS.HEIGHT * fit.scale * LAYOUT.ROW_STEP,
  };
}

export type CardPosRot = { pos: [number, number, number]; rot: [number, number, number] };

/** Sizes of the rows, back row first; the back rows take the extra card when it does not divide */
export function splitHandRows(cardCount: number, rows: number): number[] {
  const rowCount = Math.max(1, Math.min(rows, cardCount));
  const base = Math.floor(cardCount / rowCount);
  const extra = cardCount % rowCount;
  return Array.from({ length: rowCount }, (_, r) => base + (r < extra ? 1 : 0));
}

/**
 * Slot positions: rows from back (top, first cards in hand order) to front (bottom), each an
 * arc with a fan. The front row stays where a single row would be; rows behind it rise by
 * rowStep, so the corner index of every card stays visible.
 */
export function calcCardPositions(cardCount: number, layout: HandLayoutResult): CardPosRot[] {
  if (cardCount === 0) return [];
  const { cardSpacing, preferredSpacing, cardScale } = layout;
  const compressed = cardSpacing < preferredSpacing - 1e-9;
  const cardHeight = CARD_DIMENSIONS.HEIGHT * cardScale;
  const arcHeight = (compressed ? LAYOUT.ARC_HEIGHT.COMPRESSED : LAYOUT.ARC_HEIGHT.RELAXED) * cardHeight;
  const fanAngle = compressed ? LAYOUT.FAN_ANGLE.COMPRESSED : LAYOUT.FAN_ANGLE.RELAXED;
  const rowSizes = splitHandRows(cardCount, layout.rows);
  const positions: CardPosRot[] = [];

  let index = 0;
  rowSizes.forEach((size, row) => {
    const rowY = (rowSizes.length - 1 - row) * layout.rowStep;
    for (let j = 0; j < size; j++) {
      const t = size > 1 ? j / (size - 1) : 0.5;
      const x = (j - (size - 1) / 2) * cardSpacing;
      const y = rowY - Math.pow((t - 0.5) * 2, 2) * arcHeight + arcHeight;
      positions.push({ pos: [x, y, index * LAYOUT.Z_STEP], rot: [0, 0, (t - 0.5) * -fanAngle] });
      index += 1;
    }
  });
  return positions;
}
