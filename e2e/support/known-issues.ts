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

/** Portrait phones up to the Pro Max at 3 to 5 players: the largest hand fans into rows. */
const NARROW_HAND_TAP = 'The largest hand on a narrow phone: hand cards expose less than the 24 px tap minimum (tap-target-small). The hand fans into two or three rows, and the audit measures each strip against the neighbouring cards of every row.';
/** Landscape phones (750x340: iPhone 14 landscape, the matrix's narrow landscape; Pixel 7 landscape) at every table size. */
const LANDSCAPE_PROMPT = 'A landscape phone: the bidding panel in the prompt region covers the name and bid labels of the far seats (hud-occludes-scene).';

export const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    title: /^(galaxy-fold-folded|iphone-se) \(\d+x\d+\) › 3 players: the largest hand is playable$/,
    projects: /^viewport-matrix/,
    mode: 'fails',
    reason: NARROW_HAND_TAP,
  },
  {
    title: /^phone-landscape-narrow \(\d+x\d+\) › [36] players: the largest hand is playable$/,
    projects: /^viewport-matrix/,
    mode: 'fails',
    reason: `${LANDSCAPE_PROMPT} At 3 players also ${NARROW_HAND_TAP}`,
  },
  // The device projects (viewports.spec.ts): the same layout bugs per device and table size.
  {
    title: /^3 players: the largest hand is playable$/,
    projects: /^(android-phone|fold-cover|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: NARROW_HAND_TAP,
  },
  {
    title: /^3 players: the largest hand is playable$/,
    projects: /^android-tablet$/,
    mode: 'fails',
    reason: 'Galaxy Tab S9 portrait: when your card leaves the 20-card hand, the hand fits 19 cards and a hand card jumps 0.25 NDC in one frame (teleport).',
  },
  {
    title: /^4 players: the largest hand is playable$/,
    projects: /^(android-phone|fold-cover|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: NARROW_HAND_TAP,
  },
  {
    title: /^5 players: the largest hand is playable$/,
    projects: /^fold-cover$/,
    mode: 'fails',
    reason: NARROW_HAND_TAP,
  },
  {
    title: /^[3-6] players: the largest hand is playable$/,
    projects: /^(android-landscape|iphone-landscape)$/,
    mode: 'fails',
    reason: `${LANDSCAPE_PROMPT} At 3 players also ${NARROW_HAND_TAP}`,
  },
];

/** The entry for a test, if its title and project match one. */
export function knownIssueFor(title: string, project: string): KnownIssue | undefined {
  return KNOWN_ISSUES.find((issue) => issue.title.test(title) && (issue.projects?.test(project) ?? true));
}
