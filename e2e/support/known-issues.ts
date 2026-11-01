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

/** The narrow phones and the landscape phone of the viewport matrix where the largest hand breaks layout. */
const NARROW_HAND_LAYOUT = 'The largest hand on a narrow phone: hand cards under the 24 px tap minimum (tap-target-small) and HUD controls covering cards and seat labels (hud-occludes-scene).';

export const KNOWN_ISSUES: readonly KnownIssue[] = [
  {
    title: /^reconnect-missed-trick-complete with 6 players recovers cleanly$/,
    mode: 'fails',
    reason: 'A trick completed while disconnected: a collecting card changes direction abruptly when the client recovers it from state (path-kink on ELVES-2).',
  },
  {
    title: /^high-latency with [36] players recovers cleanly$/,
    mode: 'flaky',
    reason: 'Under 30 ms+ latency with jitter a collecting card sometimes kinks or rotates abruptly (path-kink, rotation-pop), on some runs only.',
  },
  {
    title: /^(galaxy-fold-folded|iphone-se) \(\d+x\d+\) › 3 players: the largest hand is playable$/,
    projects: /^viewport-matrix/,
    mode: 'fails',
    reason: NARROW_HAND_LAYOUT,
  },
  {
    title: /^phone-landscape-narrow \(\d+x\d+\) › [36] players: the largest hand is playable$/,
    projects: /^viewport-matrix/,
    mode: 'fails',
    reason: NARROW_HAND_LAYOUT,
  },
  {
    title: /^(galaxy-fold-folded|iphone-se) \(\d+x\d+\) › 6 players: the largest hand is playable$/,
    projects: /^viewport-matrix-webkit$/,
    mode: 'fails',
    reason: 'WebKit only: a bid control button overlaps the "Place bid" button on a narrow phone (hud-overlap).',
  },
  // The device projects (viewports.spec.ts): the same layout bug per device and table size.
  {
    title: /^3 players: the largest hand is playable$/,
    projects: /^(android-landscape|android-phone|android-tablet|fold-cover|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: `${NARROW_HAND_LAYOUT} Phones and the Galaxy Tab also show 3D labels below the legible size (scene-text-unreadable).`,
  },
  {
    title: /^4 players: the largest hand is playable$/,
    projects: /^(android-landscape|android-phone|fold-cover|ipad|ipad-landscape|ipad-mini|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: `${NARROW_HAND_LAYOUT} On iPads 3D labels render below 10 px (scene-text-unreadable).`,
  },
  {
    title: /^5 players: the largest hand is playable$/,
    projects: /^(android-landscape|fold-cover|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: NARROW_HAND_LAYOUT,
  },
  {
    title: /^6 players: the largest hand is playable$/,
    projects: /^(android-landscape|iphone|iphone-pro-max|iphone-se)$/,
    mode: 'fails',
    reason: NARROW_HAND_LAYOUT,
  },
  {
    title: /^a real touch plays a card$/,
    mode: 'flaky',
    reason: 'After a card is played with real device touch the trick never settles (wait-timeout, collection-stuck, skipped-play-animation); it mixes real-time input with the virtual clock, so the cause is not yet pinned down.',
  },
];

/** The entry for a test, if its title and project match one. */
export function knownIssueFor(title: string, project: string): KnownIssue | undefined {
  return KNOWN_ISSUES.find((issue) => issue.title.test(title) && (issue.projects?.test(project) ?? true));
}
