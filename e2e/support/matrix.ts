/**
 * Combination designs for the matrix suites. A full cartesian product of the sandbox axes (card
 * theme x table theme x UI theme x collection style x card size x scenario x table size x seed)
 * is hundreds of thousands of runs, so the suites pick a covering design instead:
 *
 * - `eachChoice`: every value of every axis appears in at least one row (as many rows as the
 *   largest axis). Pull requests and manual dispatches.
 * - `allPairs`: every pair of values of any two axes appears in at least one row. Most
 *   interaction bugs need only two settings to line up, so this is the weekly run
 *   (E2E_FULL_MATRIX=1).
 *
 * Both are deterministic: the same axes always give the same rows in the same order, so a test
 * title names one row across runs and a failure replays. The in-process matrix suites use
 * party/test-support/matrix.ts instead: it supports excluded combinations but enumerates the full
 * product, which these axes are far too large for.
 */

export type MatrixValue = string | number;
export type MatrixAxes = Record<string, readonly MatrixValue[]>;
export type MatrixRow<A extends MatrixAxes> = { [K in keyof A]: A[K][number] };

function axisNames<A extends MatrixAxes>(axes: A): Array<keyof A & string> {
  const names = Object.keys(axes) as Array<keyof A & string>;
  for (const name of names) {
    if (axes[name].length === 0) throw new Error(`Matrix axis "${name}" has no values`);
  }
  return names;
}

function toRow<A extends MatrixAxes>(axes: A, names: Array<keyof A & string>, indices: readonly number[]): MatrixRow<A> {
  return Object.fromEntries(names.map((name, axis) => [name, axes[name][indices[axis]]])) as MatrixRow<A>;
}

/** Row r takes value r mod n of each axis: every value appears, neighbouring values rotate. */
export function eachChoice<A extends MatrixAxes>(axes: A): Array<MatrixRow<A>> {
  const names = axisNames(axes);
  const rowCount = Math.max(...names.map((name) => axes[name].length));
  return Array.from({ length: rowCount }, (_, row) => toRow(axes, names, names.map((name) => row % axes[name].length)));
}

const pairKey = (axisA: number, valueA: number, axisB: number, valueB: number): string =>
  axisA < axisB ? `${axisA}:${valueA}|${axisB}:${valueB}` : `${axisB}:${valueB}|${axisA}:${valueA}`;

function pairsOf(indices: readonly number[]): string[] {
  const keys: string[] = [];
  for (let a = 0; a < indices.length; a++) {
    for (let b = a + 1; b < indices.length; b++) keys.push(pairKey(a, indices[a], b, indices[b]));
  }
  return keys;
}

function everyPair(sizes: readonly number[]): Set<string> {
  const pairs = new Set<string>();
  sizes.forEach((sizeA, a) => {
    for (let b = a + 1; b < sizes.length; b++) {
      for (let va = 0; va < sizeA; va++) {
        for (let vb = 0; vb < sizes[b]; vb++) pairs.add(pairKey(a, va, b, vb));
      }
    }
  });
  return pairs;
}

/** How many uncovered pairs `value` on `axis` would cover next to the axes already chosen. */
function gainOf(axis: number, value: number, indices: readonly number[], uncovered: ReadonlySet<string>): number {
  let gain = 0;
  indices.forEach((chosen, other) => {
    if (other !== axis && chosen !== -1 && uncovered.has(pairKey(axis, value, other, chosen))) gain++;
  });
  return gain;
}

/**
 * Greedy all-pairs design: each row starts from the first pair no row covers yet and fills the
 * other axes with the value that covers the most uncovered pairs (ties rotate with the row
 * number so values spread). Close to the minimum (the product of the two largest axes).
 */
export function allPairs<A extends MatrixAxes>(axes: A): Array<MatrixRow<A>> {
  const names = axisNames(axes);
  const sizes = names.map((name) => axes[name].length);
  const uncovered = everyPair(sizes);

  const rows: number[][] = [];
  while (uncovered.size > 0) {
    const [seedPair] = uncovered;
    const indices = new Array<number>(sizes.length).fill(-1);
    for (const part of seedPair.split('|')) {
      const [axis, value] = part.split(':').map(Number);
      indices[axis] = value;
    }
    for (let axis = 0; axis < sizes.length; axis++) {
      if (indices[axis] !== -1) continue;
      const candidates = Array.from({ length: sizes[axis] }, (_, step) => (step + rows.length) % sizes[axis]);
      const gains = candidates.map((value) => gainOf(axis, value, indices, uncovered));
      indices[axis] = candidates[gains.indexOf(Math.max(...gains))];
    }
    for (const key of pairsOf(indices)) uncovered.delete(key);
    rows.push(indices);
  }
  return rows.map((indices) => toRow(axes, names, indices));
}

/** A test title for a row: `axis=value` for every axis, in axis order. */
export function describeRow(row: Record<string, MatrixValue>): string {
  return Object.entries(row).map(([name, value]) => `${name}=${value}`).join(' ');
}
