import { expectCleanRun, test } from './support/sandbox';

/**
 * The core animation sequences on every browser and device: throws (drag, flick, double tap,
 * slow drop), landing, collection in every style, hand shuffle/sort, special cards and round and
 * game transitions. Deterministic (virtual clock), so a failure replays identically.
 * The 4-player drag throw (`lead-drag-throw`) and round transition run in viewports.spec.ts on the
 * same projects; repeating them here would replay identical runs.
 */
const CORE_SCENARIOS = [
  'baseline-trick',
  'slow-drop',
  'flick-play',
  'double-tap-play',
  'drag-interrupted',
  'bot-burst',
  'shuffle-during-flight',
  'sort-during-collection',
  'special-cards',
  'collection-style-switch',
  'game-end',
] as const;

for (const scenario of CORE_SCENARIOS) {
  test(`${scenario} plays cleanly`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario, playerCount: 4 }));
  });
}
