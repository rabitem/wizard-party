import {
  CARD_DIMENSIONS,
  CARD_STACKING,
  TABLE_SURFACE,
  getCardRestY,
} from '@/presentation/config/physics.config';

export const STACKED_DECK_LAYOUT = {
  DECK_SCALE: 0.5,
  SEAT_TO_DECK_FACTOR: 0.75,
  STACK_HEIGHT: CARD_STACKING.HEIGHT_PER_CARD,
  BASE_WIDTH: CARD_DIMENSIONS.WIDTH * 0.5,
  BASE_HEIGHT: CARD_DIMENSIONS.HEIGHT * 0.5,
  BASE_THICKNESS: CARD_STACKING.HEIGHT_PER_CARD,
  NATURAL_OFFSET_X: 0.012,
  NATURAL_OFFSET_Z: 0.012,
  ROTATION_VARIANCE: 0.06,
  MAX_VISIBLE_PHYSICS_CARDS: 6,
} as const;

interface VisibleDeckCardYParams {
  hiddenCount: number;
  visibleIndex: number;
}

interface CollectingCardDeckPlacementParams {
  existingCardCount: number;
  collectingCardCount: number;
  collectingCardIndex: number;
}

interface CollectingCardDeckPlacement {
  hiddenCount: number;
  visibleIndex: number;
  y: number;
}

interface StackedDeckCardLayoutParams {
  cardId: string;
  hiddenCount: number;
  visibleIndex: number;
}

interface CollectingCardTargetLayoutParams {
  cardId: string;
  deckPosition: [number, number, number];
  deckRotation: number;
  existingCardCount: number;
  collectingCardCount: number;
  collectingCardIndex: number;
}

interface StackedDeckCardLayout {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

interface CollectingCardTargetLayout {
  hiddenCount: number;
  visibleIndex: number;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function getHiddenDeckThickness(hiddenCount: number): number {
  return sanitizeCount(hiddenCount) * STACKED_DECK_LAYOUT.BASE_THICKNESS;
}

export function getHiddenDeckBaseY(hiddenCount: number): number {
  const thickness = getHiddenDeckThickness(hiddenCount);
  if (thickness <= 0) return getCardRestY(STACKED_DECK_LAYOUT.DECK_SCALE);

  return TABLE_SURFACE.FELT_Y + TABLE_SURFACE.EPSILON + thickness / 2;
}

function getHiddenDeckTopY(hiddenCount: number): number {
  const thickness = getHiddenDeckThickness(hiddenCount);
  if (thickness <= 0) return TABLE_SURFACE.FELT_Y;

  return getHiddenDeckBaseY(hiddenCount) + thickness / 2;
}

export function getVisibleDeckCardY({
  hiddenCount,
  visibleIndex,
}: VisibleDeckCardYParams): number {
  const sanitizedHiddenCount = sanitizeCount(hiddenCount);
  const sanitizedVisibleIndex = sanitizeCount(visibleIndex);
  const cardHalfThickness = CARD_DIMENSIONS.THICKNESS * STACKED_DECK_LAYOUT.DECK_SCALE / 2;

  if (sanitizedHiddenCount === 0) {
    return getCardRestY(STACKED_DECK_LAYOUT.DECK_SCALE) +
      sanitizedVisibleIndex * STACKED_DECK_LAYOUT.STACK_HEIGHT;
  }

  return getHiddenDeckTopY(sanitizedHiddenCount) +
    TABLE_SURFACE.EPSILON +
    cardHalfThickness +
    sanitizedVisibleIndex * STACKED_DECK_LAYOUT.STACK_HEIGHT;
}

export function getStackedDeckPosition(
  seatPosition: [number, number, number]
): [number, number, number] {
  return [
    seatPosition[0] * STACKED_DECK_LAYOUT.SEAT_TO_DECK_FACTOR,
    0,
    seatPosition[2] * STACKED_DECK_LAYOUT.SEAT_TO_DECK_FACTOR,
  ];
}

function getStackedDeckCardOffsets(
  cardId: string,
  index: number
): {
  offsetX: number;
  offsetZ: number;
  rotationY: number;
} {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) {
    hash = ((hash << 5) - hash) + cardId.charCodeAt(i);
    hash = hash & hash;
  }

  const seed1 = Math.abs(Math.sin(hash * 1.5 + index)) * 10000;
  const seed2 = Math.abs(Math.sin(hash * 2.1 + index)) * 10000;
  const seed3 = Math.abs(Math.sin(hash * 0.7 + index)) * 10000;

  return {
    offsetX: ((seed1 % 1000) / 1000 - 0.5) * STACKED_DECK_LAYOUT.NATURAL_OFFSET_X * 2,
    offsetZ: ((seed2 % 1000) / 1000 - 0.5) * STACKED_DECK_LAYOUT.NATURAL_OFFSET_Z * 2,
    rotationY: ((seed3 % 1000) / 1000 - 0.5) * STACKED_DECK_LAYOUT.ROTATION_VARIANCE * 2,
  };
}

export function getStackedDeckCardLayout({
  cardId,
  hiddenCount,
  visibleIndex,
}: StackedDeckCardLayoutParams): StackedDeckCardLayout {
  const sanitizedVisibleIndex = sanitizeCount(visibleIndex);
  const offsets = getStackedDeckCardOffsets(cardId, sanitizedVisibleIndex);

  return {
    position: [
      offsets.offsetX,
      getVisibleDeckCardY({ hiddenCount, visibleIndex: sanitizedVisibleIndex }),
      offsets.offsetZ,
    ],
    // Lay the card face up (X), then turn it in the felt plane (local Z, which
    // now points up): XYZ order makes this a yaw, matching the collecting card.
    rotation: [-Math.PI / 2, 0, offsets.rotationY],
    scale: STACKED_DECK_LAYOUT.DECK_SCALE,
  };
}

function rotateDeckLocalPosition(
  localPosition: [number, number, number],
  deckPosition: [number, number, number],
  deckRotation: number
): [number, number, number] {
  const cos = Math.cos(deckRotation);
  const sin = Math.sin(deckRotation);

  return [
    deckPosition[0] + localPosition[0] * cos + localPosition[2] * sin,
    deckPosition[1] + localPosition[1],
    deckPosition[2] - localPosition[0] * sin + localPosition[2] * cos,
  ];
}

function getCollectingCardDeckPlacement({
  existingCardCount,
  collectingCardCount,
  collectingCardIndex,
}: CollectingCardDeckPlacementParams): CollectingCardDeckPlacement {
  const existingCount = sanitizeCount(existingCardCount);
  const collectingCount = sanitizeCount(collectingCardCount);
  const collectionIndex = sanitizeCount(collectingCardIndex);
  const finalCardCount = existingCount + collectingCount;
  const hiddenCount = Math.max(
    0,
    finalCardCount - STACKED_DECK_LAYOUT.MAX_VISIBLE_PHYSICS_CARDS
  );
  const finalCardIndex = existingCount + collectionIndex;
  const visibleIndex = Math.max(0, finalCardIndex - hiddenCount);

  return {
    hiddenCount,
    visibleIndex,
    y: getVisibleDeckCardY({ hiddenCount, visibleIndex }),
  };
}

export function getCollectingCardTargetLayout({
  cardId,
  deckPosition,
  deckRotation,
  existingCardCount,
  collectingCardCount,
  collectingCardIndex,
}: CollectingCardTargetLayoutParams): CollectingCardTargetLayout {
  const placement = getCollectingCardDeckPlacement({
    existingCardCount,
    collectingCardCount,
    collectingCardIndex,
  });
  const deckCardLayout = getStackedDeckCardLayout({
    cardId,
    hiddenCount: placement.hiddenCount,
    visibleIndex: placement.visibleIndex,
  });

  return {
    hiddenCount: placement.hiddenCount,
    visibleIndex: placement.visibleIndex,
    position: rotateDeckLocalPosition(deckCardLayout.position, deckPosition, deckRotation),
    rotationY: deckRotation + deckCardLayout.rotation[2],
    scale: deckCardLayout.scale,
  };
}
