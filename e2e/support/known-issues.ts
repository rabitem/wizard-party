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

/** Landscape phones (750x340: iPhone 14 landscape, the matrix's narrow landscape; Pixel 7 landscape) at every table size. */
const LANDSCAPE_PROMPT = 'A landscape phone: the bidding panel in the prompt region covers the name and bid labels of the far seats (hud-occludes-scene).';

export const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    title: /^phone-landscape-narrow \(\d+x\d+\) › 6 players: the largest hand is playable$/,
    projects: /^viewport-matrix/,
    mode: 'fails',
    reason: LANDSCAPE_PROMPT,
  },
  {
    title: /^phone-landscape-narrow \(\d+x\d+\) › 3 players: the largest hand is playable$/,
    projects: /^viewport-matrix-(webkit|firefox)$/,
    mode: 'fails',
    reason: LANDSCAPE_PROMPT,
  },
  // The device projects (viewports.spec.ts).
  {
    title: /^[3-6] players: the largest hand is playable$/,
    projects: /^(android-landscape|iphone-landscape)$/,
    mode: 'fails',
    reason: LANDSCAPE_PROMPT,
  },
];

/** The entry for a test, if its title and project match one. */
export function knownIssueFor(title: string, project: string): KnownIssue | undefined {
  return KNOWN_ISSUES.find((issue) => issue.title.test(title) && (issue.projects?.test(project) ?? true));
}
