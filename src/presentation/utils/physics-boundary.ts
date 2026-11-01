interface HorizontalPoint {
  x: number;
  z: number;
}

const DEFAULT_DIRECTION: HorizontalPoint = { x: 1, z: 0 };
const DIRECTION_EPSILON = 0.000001;

function isFinitePoint(point: HorizontalPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.z);
}

function normalizeDirection(point: HorizontalPoint): HorizontalPoint | null {
  if (!isFinitePoint(point)) return null;

  const length = Math.hypot(point.x, point.z);
  if (length < DIRECTION_EPSILON) return null;

  return { x: point.x / length, z: point.z / length };
}

function resolveDirection(point: HorizontalPoint, fallback?: HorizontalPoint): HorizontalPoint {
  return normalizeDirection(point) ??
    (fallback ? normalizeDirection(fallback) : null) ??
    DEFAULT_DIRECTION;
}

/**
 * Keeps a horizontal X/Z position outside a radius around the table center.
 * If the position is exactly at center, the fallback direction preserves the
 * side the card came from instead of leaving it inside the collider.
 */
export function constrainToHorizontalRadius(
  point: HorizontalPoint,
  radius: number,
  fallback?: HorizontalPoint
): HorizontalPoint {
  const distance = isFinitePoint(point) ? Math.hypot(point.x, point.z) : 0;
  if (distance >= radius) return { x: point.x, z: point.z };

  const direction = resolveDirection(point, fallback);
  return {
    x: direction.x * radius,
    z: direction.z * radius,
  };
}

export function constrainToHorizontalBand(
  point: HorizontalPoint,
  {
    minRadius,
    maxRadius,
  }: { minRadius: number; maxRadius: number },
  fallback?: HorizontalPoint
): HorizontalPoint {
  const resolvedMinRadius = Math.max(0, minRadius);
  const resolvedMaxRadius = Math.max(resolvedMinRadius, maxRadius);
  const distance = isFinitePoint(point) ? Math.hypot(point.x, point.z) : 0;

  if (distance < resolvedMinRadius) {
    return constrainToHorizontalRadius(point, resolvedMinRadius, fallback);
  }

  if (distance <= resolvedMaxRadius) {
    return { x: point.x, z: point.z };
  }

  const direction = resolveDirection(point, fallback);
  return {
    x: direction.x * resolvedMaxRadius,
    z: direction.z * resolvedMaxRadius,
  };
}

export function getRectangularFootprintClearanceRadius(
  baseRadius: number,
  width: number,
  height: number,
  scale: number = 1,
  epsilon: number = 0
): number {
  const halfDiagonal = Math.hypot(width * scale, height * scale) / 2;
  return baseRadius + halfDiagonal + epsilon;
}
