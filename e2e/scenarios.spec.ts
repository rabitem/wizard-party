import { SANDBOX_PLAYER_COUNTS } from '../src/presentation/config/sandbox.config';
import { expectCleanRun, test } from './support/sandbox';

/**
 * The core animation sequences on every browser and device: throws (drag, flick, double tap,
 * slow drop, a drag dropped back on the hand), landing, collection in every style, hand
 * shuffle/sort, special cards, a theme change mid-flight, a whole round at server pace and round
 * and game transitions. Deterministic (virtual clock), so a failure replays identically.
 * The 4-player drag throw (`lead-drag-throw`) and round transition run in viewports.spec.ts on the
 * same projects; repeating them here would replay identical runs.
 *
 * Pull requests play four seats; the weekly run (E2E_FULL_MATRIX=1) plays every table size, where
 * seat positions, throw paths and the collection stack differ.
 */
const CORE_SCENARIOS = [
  'baseline-trick',
  'slow-drop',
  'flick-play',
  'double-tap-play',
  'drag-cancel',
  'drag-interrupted',
  'bot-burst',
  'back-to-back-tricks',
  'shuffle-during-flight',
  'sort-during-collection',
  'special-cards',
  'collection-style-switch',
  'theme-switch-mid-flight',
  'game-end',
] as const;
const PLAYER_COUNTS = process.env.E2E_FULL_MATRIX === '1' ? SANDBOX_PLAYER_COUNTS : [4];

for (const scenario of CORE_SCENARIOS) {
  for (const playerCount of PLAYER_COUNTS) {
    test(`${scenario} with ${playerCount} players plays cleanly`, async ({ sandbox }) => {
      expectCleanRun(await sandbox.run({ scenario, playerCount }));
    });
  }
}
