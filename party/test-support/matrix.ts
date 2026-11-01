/**
 * Rows of the in-process matrix suites (levels 3 and 4): the all-pairs design of
 * e2e/support/matrix.ts by default, in which every pair of values of any two axes shares a row,
 * and the cartesian product when the environment sets FULL_MATRIX=1 (the weekly run). Both are
 * deterministic: the same axes always give the same rows in the same order. Not part of the worker.
 */
import { allPairs, type MatrixAxes, type MatrixRow } from '../../e2e/support/matrix';

/** `FULL_MATRIX=1` runs every combination; unset runs the all-pairs subset. */
export const FULL_MATRIX = process.env.FULL_MATRIX === '1';

/** Every combination of the axes, in axis order (the last axis varies fastest). */
function cartesian<A extends MatrixAxes>(axes: A): MatrixRow<A>[] {
  let rows: Partial<MatrixRow<A>>[] = [{}];
  for (const key of Object.keys(axes) as (keyof A)[]) rows = rows.flatMap((row) => axes[key].map((value) => ({ ...row, [key]: value })));
  return rows as MatrixRow<A>[];
}

/** The full product under FULL_MATRIX=1, the all-pairs subset otherwise. */
export function matrixRows<A extends MatrixAxes>(axes: A): MatrixRow<A>[] {
  return FULL_MATRIX ? cartesian(axes) : allPairs(axes);
}
