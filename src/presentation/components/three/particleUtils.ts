// =============================================================================
// Particle System Utilities
// =============================================================================

/**
 * Seeded pseudo-random number generator for deterministic particle generation.
 * This ensures particle positions and behaviors are consistent across renders.
 */
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}
