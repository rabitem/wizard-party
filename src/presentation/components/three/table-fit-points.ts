import { CAMERA_CONFIG } from '@/presentation/config/layout.config';
import { getSeatPlateRotation, getSeatRimAngle } from '../table/seat-geometry';

/** A point on the table plane (world x, z) the camera framing keeps inside the view */
export type TableFitPoint = readonly [number, number];

/** A symmetric strip of the given half-width through the table centre (the worst-case fit) */
export function getHalfWidthFitPoints(halfWidth: number): TableFitPoint[] {
  return [[-halfWidth, 0], [halfWidth, 0]];
}

/**
 * What must stay on screen for a table size: the corners of every seat's brandmark plate (the
 * outermost thing a seat draws), padded by SEAT_PADDING. Real corners instead of a single
 * half-width let the framing account for perspective: a side seat on the near half of the
 * table (5 and 6 seats) is closer to the camera and needs more room than one on the far half
 * (3 seats). Unknown counts use the worst-case half-width.
 */
export function getTableFitPoints(playerCount: number): TableFitPoint[] {
  if (!Number.isInteger(playerCount) || playerCount < 2) return getHalfWidthFitPoints(CAMERA_CONFIG.FIT_HALF_WIDTH);
  const { SEAT_RIM_RADIUS, SEAT_PLATE, SEAT_PADDING } = CAMERA_CONFIG.FRAMING;
  const halfLength = SEAT_PLATE.HALF_LENGTH + SEAT_PADDING;
  const halfDepth = SEAT_PLATE.HALF_DEPTH + SEAT_PADDING;
  const points: TableFitPoint[] = [];
  for (let seat = 0; seat < playerCount; seat++) {
    const angle = getSeatRimAngle(seat, playerCount);
    const rotation = getSeatPlateRotation(angle);
    const cx = Math.cos(angle) * SEAT_RIM_RADIUS;
    const cz = Math.sin(angle) * SEAT_RIM_RADIUS;
    // The plate's long side runs along its local x axis, rotated around y by `rotation`
    const along: TableFitPoint = [Math.cos(rotation), -Math.sin(rotation)];
    const across: TableFitPoint = [Math.sin(rotation), Math.cos(rotation)];
    for (const a of [-halfLength, halfLength]) {
      for (const b of [-halfDepth, halfDepth]) {
        points.push([cx + along[0] * a + across[0] * b, cz + along[1] * a + across[1] * b]);
      }
    }
  }
  return points;
}
