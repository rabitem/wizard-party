/**
 * Clock port
 *
 * Timers, grace periods, pauses and bot thinking budgets read the time from an
 * IClock, so they can be tested and replayed without faking Date.now.
 */

export interface IClock {
  /** Milliseconds since the epoch, like Date.now(). */
  now(): number;
}

export const systemClock: IClock = {
  now: () => Date.now(),
};

/** A clock that only moves when told to (tests, replays). */
export interface IManualClock extends IClock {
  set(now: number): void;
  advance(ms: number): void;
}

export function createManualClock(start = 0): IManualClock {
  let current = start;
  return {
    now: () => current,
    set: (now) => {
      current = now;
    },
    advance: (ms) => {
      current += ms;
    },
  };
}
