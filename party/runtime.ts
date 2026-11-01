/**
 * The room's ports under the names the handlers use (`Party.Connection`, `Party.Room`). The game
 * code depends only on these interfaces, never on a hosting runtime: partyserver's Connection and
 * the worker's room adapter satisfy them, and so do the sandbox loopback and the test harness.
 */
export type {
  RoomConnection as Connection,
  RoomHost as Room,
  RoomStorage,
  RoomTimers,
} from './room/ports';
