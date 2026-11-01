/**
 * Random source port
 *
 * Shuffling the deck reads chance from an IRandom, so tests and replays can seed
 * a deal. The bots still sample Math.random directly; callers that need a fully
 * deterministic table scope Math.random as well (see withSeededRandom).
 */

export interface IRandom {
  /** A float in [0, 1), like Math.random(). */
  next(): number;
}

export const systemRandom: IRandom = {
  next: () => Math.random(),
};

/** Mulberry32 increment (2^32 / golden ratio, the usual Weyl constant). */
const MULBERRY32_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 4294967296;

/**
 * Deterministic 32-bit generator (mulberry32): the same seed gives the same sequence.
 */
export function createSeededRandom(seed: number): IRandom {
  let state = seed >>> 0;
  return {
    next: () => {
      state = (state + MULBERRY32_INCREMENT) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
    },
  };
}

/** A whole number in [0, maxExclusive). */
export function randomInt(random: IRandom, maxExclusive: number): number {
  return Math.floor(random.next() * maxExclusive);
}
