/**
 * Slowly varying wind gusts. Two incommensurate sines give a non-repeating
 * 0..1 envelope; squaring it keeps calm stretches long and gusts short.
 */
export function gustEnvelope(time: number, seed = 0): number {
  const wave = Math.sin(time * 0.13 + seed) * 0.6 + Math.sin(time * 0.31 + 1.7 + seed * 2.3) * 0.4;
  const normalised = 0.5 + 0.5 * wave;
  return normalised * normalised;
}

/**
 * Advances an integrated wind offset in place (velocity * (1 + gust) * dt).
 * Integrating on the CPU keeps particles continuous when the wind speed
 * changes. The offset is not wrapped here: the shader scales it per particle
 * before its own mod(), so wrapping would make particles jump. Growth is a
 * few thousand units per hour at most, well within float precision.
 */
export function advanceWind(
  offset: { x: number; y: number; z: number },
  wind: readonly [number, number, number],
  gust: number,
  delta: number,
): void {
  const boost = 1 + gust * 1.5;
  offset.x += wind[0] * boost * delta;
  offset.y += wind[1] * boost * delta;
  offset.z += wind[2] * boost * delta;
}
