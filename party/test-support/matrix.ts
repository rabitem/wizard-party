/**
 * Rows of the matrix suites (levels 3 and 4): the cartesian product of a few axes when the
 * environment sets FULL_MATRIX=1, otherwise a pairwise subset in which every pair of values of any
 * two axes still shares a row. Mirrors E2E_FULL_MATRIX of e2e/playability-matrix.spec.ts. Both
 * are deterministic: the same axes always give the same rows in the same order. Not part of the
 * worker.
 */

/** `FULL_MATRIX=1` runs every combination; unset runs the pairwise subset. */
export const FULL_MATRIX = process.env.FULL_MATRIX === '1';

export type Axes = Record<string, readonly unknown[]>;
export type MatrixRow<A extends Axes> = { [K in keyof A]: A[K][number] };

/** Every combination of the axes that `allowed` accepts, in axis order (the last axis varies fastest). */
export function cartesian<A extends Axes>(axes: A, allowed: (row: MatrixRow<A>) => boolean = () => true): MatrixRow<A>[] {
  const keys = Object.keys(axes) as (keyof A)[];
  let rows: Partial<MatrixRow<A>>[] = [{}];
  for (const key of keys) rows = rows.flatMap((row) => axes[key].map((value) => ({ ...row, [key]: value })));
  return (rows as MatrixRow<A>[]).filter(allowed);
}

/** The value pairs a row covers, as `axis:value|axis:value` with value indexes. */
function pairsOf<A extends Axes>(axes: A, row: MatrixRow<A>): string[] {
  const keys = Object.keys(axes) as (keyof A)[];
  const indexes = keys.map((key) => axes[key].indexOf(row[key]));
  const pairs: string[] = [];
  for (let a = 0; a < keys.length; a++) {
    for (let b = a + 1; b < keys.length; b++) pairs.push(`${a}:${indexes[a]}|${b}:${indexes[b]}`);
  }
  return pairs;
}

/**
 * A greedy pairwise cover: each step takes the first allowed combination that covers the most
 * pairs no row covers yet, until every pair some allowed combination has is covered.
 */
export function pairwise<A extends Axes>(axes: A, allowed: (row: MatrixRow<A>) => boolean = () => true): MatrixRow<A>[] {
  const candidates = cartesian(axes, allowed).map((row) => ({ row, pairs: pairsOf(axes, row) }));
  const uncovered = new Set(candidates.flatMap((candidate) => candidate.pairs));
  const rows: MatrixRow<A>[] = [];
  while (uncovered.size > 0) {
    let best = candidates[0];
    let bestGain = -1;
    for (const candidate of candidates) {
      const gain = candidate.pairs.filter((pair) => uncovered.has(pair)).length;
      if (gain > bestGain) {
        best = candidate;
        bestGain = gain;
      }
    }
    rows.push(best.row);
    for (const pair of best.pairs) uncovered.delete(pair);
  }
  return rows;
}

/** The full product under FULL_MATRIX=1, the pairwise subset otherwise. */
export function matrixRows<A extends Axes>(axes: A, allowed?: (row: MatrixRow<A>) => boolean): MatrixRow<A>[] {
  return FULL_MATRIX ? cartesian(axes, allowed) : pairwise(axes, allowed);
}
