/**
 * Domain ports: pure interfaces (with default adapters) for the outside world the
 * domain needs - chance and time. Adapters for other runtimes implement these.
 */

export {
  type IRandom,
  systemRandom,
  createSeededRandom,
  randomInt,
} from './random.port';

export {
  type IClock,
  type IManualClock,
  systemClock,
  createManualClock,
} from './clock.port';
