import { TOURNAMENT_LIMITS } from './tournament.constants';
import { TournamentError } from './tournament-error';

export interface TableSizeBounds {
  min: number;
  max: number;
}

/** Humans at one table plus the bots that pad it. */
export interface TableSeating {
  humans: number;
  bots: number;
}

/**
 * Splits `count` players into as few tables as possible whose sizes differ by at most one and lie
 * within [min, max]. E.g. 7 -> [4, 3], 13 (max 5) -> [5, 4, 4]. Larger tables come first.
 * Throws when no such split exists (e.g. 4 players at tables of exactly 3).
 */
export function planTables(count: number, { min, max }: TableSizeBounds): number[] {
  if (!Number.isInteger(count) || count < min || min < 1 || max < min) {
    throw new TournamentError('invalid_state', `${count} players can't be seated at tables of ${min}–${max}.`);
  }
  const tables = Math.ceil(count / max);
  const base = Math.floor(count / tables);
  // Fewest tables give the largest base size; if that is still below min no split exists.
  if (base < min) throw new TournamentError('invalid_state', `${count} players can't be seated at tables of ${min}–${max}.`);
  const remainder = count % tables;
  return Array.from({ length: tables }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function canSeat(count: number, bounds: TableSizeBounds): boolean {
  if (!Number.isInteger(count) || count < bounds.min) return false;
  return Math.floor(count / Math.ceil(count / bounds.max)) >= bounds.min;
}

/** Largest player count <= `count` that can be seated without bots (0 when none). */
export function largestSeatableCount(count: number, bounds: TableSizeBounds): number {
  for (let n = count; n >= bounds.min; n--) if (canSeat(n, bounds)) return n;
  return 0;
}

/**
 * Seats `humans` players at tables of at most `maxTableSize`. Without bots this is planTables.
 * With bots, a field that cannot be split evenly (or is smaller than a table) is spread over the
 * fewest tables and each table is padded with bots up to the minimum size.
 */
export function planSeating(humans: number, maxTableSize: number, allowBots: boolean): TableSeating[] {
  const bounds = { min: TOURNAMENT_LIMITS.MIN_TABLE_SIZE, max: maxTableSize };
  if (canSeat(humans, bounds)) return planTables(humans, bounds).map((size) => ({ humans: size, bots: 0 }));
  if (!allowBots) {
    throw new TournamentError(
      'invalid_state',
      `${humans} players can't be split into tables of ${bounds.min}–${bounds.max}. Allow bots or change the table size.`
    );
  }
  if (humans < 1) throw new TournamentError('too_few_entrants', 'Nobody is left to seat.');
  const tables = Math.ceil(humans / maxTableSize);
  const base = Math.floor(humans / tables);
  const remainder = humans % tables;
  return Array.from({ length: tables }, (_, index) => {
    const seated = base + (index < remainder ? 1 : 0);
    return { humans: seated, bots: Math.max(0, bounds.min - seated) };
  });
}

/**
 * Deals ordered players onto tables in snake order (1, 2, 3, 3, 2, 1, ...), skipping full tables,
 * so the strongest players are spread across tables instead of meeting early.
 */
export function distributeSnake<T>(ordered: readonly T[], sizes: readonly number[]): T[][] {
  const tables: T[][] = sizes.map(() => []);
  let index = 0;
  let direction = 1;
  for (const item of ordered) {
    let guard = 0;
    while (tables[index].length >= sizes[index]) {
      ({ index, direction } = step(index, direction, sizes.length));
      if (++guard > sizes.length * 2) throw new TournamentError('invalid_state', 'More players than seats.');
    }
    tables[index].push(item);
    ({ index, direction } = step(index, direction, sizes.length));
  }
  return tables;
}

function step(index: number, direction: number, length: number): { index: number; direction: number } {
  if (length === 1) return { index: 0, direction };
  const next = index + direction;
  if (next < 0 || next >= length) return { index, direction: -direction };
  return { index: next, direction };
}

/** Deals ordered players onto tables in order: the first table gets the first players (Swiss). */
export function distributeInOrder<T>(ordered: readonly T[], sizes: readonly number[]): T[][] {
  const tables: T[][] = [];
  let offset = 0;
  for (const size of sizes) {
    tables.push(ordered.slice(offset, offset + size));
    offset += size;
  }
  if (offset < ordered.length) throw new TournamentError('invalid_state', 'More players than seats.');
  return tables;
}
