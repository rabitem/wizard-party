/**
 * Soft point sprites for the scene's particle systems (trick-win burst, sparkles, card trail,
 * collection arrival, landing dust). Points are drawn with the shared soft-disc / spark FX
 * textures instead of hard square points.
 */
export const PARTICLE_SPRITE = {
  /**
   * A soft disc fades out toward its edge, so its visible core is smaller than a square point
   * of the same size; sizes in the particle configs are multiplied by this.
   */
  SIZE_SCALE: 1.8,
  /** Fragments fainter than this are discarded (no invisible overdraw, no sorting halos) */
  ALPHA_TEST: 0.02,
} as const;

/** Point size for a soft sprite that reads like a square point of `size` */
export function softPointSize(size: number): number {
  return size * PARTICLE_SPRITE.SIZE_SCALE;
}
