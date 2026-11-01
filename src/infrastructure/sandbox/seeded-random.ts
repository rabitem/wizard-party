/** Deterministic PRNG (mulberry32). Same seed, same sequence, on every machine. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...parts: Array<string | number>): number {
  let hash = 2166136261;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Runs `fn` with Math.random replaced by a seeded generator.
 *
 * The room builds its Game with the default random source (systemRandom, which calls
 * Math.random) and the bots sample Math.random directly, so the sandbox and the room
 * harness scope the replacement to each server action to make replays reproducible.
 */
export function withSeededRandom<T>(random: () => number, fn: () => T): T {
  const original = Math.random;
  Math.random = random;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}
