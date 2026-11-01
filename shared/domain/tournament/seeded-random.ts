/*
 * Deterministic pseudo-randomness for seating. The domain never calls Math.random: the same
 * tournament state always produces the same tables, so concurrent writers that plan the same round
 * agree and every plan is reproducible in tests.
 */

/**
 * cyrb53: a fast, well mixed 53-bit string hash (every input bit affects every output bit), so
 * near-identical inputs like consecutive match ids give unrelated values. `seed` salts the hash.
 */
export function hashString53(value: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** 32-bit hash of a string (the low bits of hashString53). */
function hashString(value: string, seed = 0): number {
  return hashString53(value, seed) >>> 0;
}

/** mulberry32: a small, well distributed 32-bit PRNG. Returns floats in [0, 1). */
export function createSeededRandom(seed: string | number): () => number {
  let state = (typeof seed === 'number' ? seed : hashString(seed)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle with a seeded PRNG; returns a new array. */
export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const random = createSeededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
