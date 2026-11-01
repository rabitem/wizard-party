/**
 * Where the seats sit around the round table, relative to the local player: the local seat is
 * at the near side (+z, facing the camera) and the others follow at equal angles. Brandmarks,
 * seat nameplates and the camera framing all use this one rule.
 */
export function getSeatRimAngle(relativeIndex: number, seatCount: number): number {
  return (relativeIndex / Math.max(1, seatCount)) * Math.PI * 2 + Math.PI / 2;
}

/** Rotation (around y) of a brandmark plate at a rim angle: its long side runs along the rim */
export function getSeatPlateRotation(angle: number): number {
  return -angle + Math.PI / 2;
}
