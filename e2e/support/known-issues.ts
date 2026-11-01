/**
 * Product bugs the browser suites found that are not fixed yet. The list is the only quarantine:
 * a test is never skipped or loosened anywhere else, and every entry names what is broken.
 *
 * - `fails`: the bug reproduces on every run. The test runs and is expected to fail (test.fail),
 *   so it turns red the day the bug is fixed; remove the entry in the fix's pull request.
 * - `flaky`: the bug shows on some runs only. An expected failure cannot be flaky, so the test is
 *   marked fixme with the reason, and the report lists it.
 *
 * A test matches on its title below the file (`describe › test`) and, when given, its project.
 * The sandbox fixture (support/sandbox.ts) applies the list before the page opens.
 */
export interface KnownIssue {
  title: RegExp;
  /** Projects the bug shows on; every project when left out. */
  projects?: RegExp;
  mode: 'fails' | 'flaky';
  reason: string;
}

export const KNOWN_ISSUES: readonly KnownIssue[] = [];

/** The entry for a test, if its title and project match one. */
export function knownIssueFor(title: string, project: string): KnownIssue | undefined {
  return KNOWN_ISSUES.find((issue) => issue.title.test(title) && (issue.projects?.test(project) ?? true));
}
