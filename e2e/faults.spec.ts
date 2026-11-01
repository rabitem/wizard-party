import { SANDBOX_PLAYER_COUNTS } from '../src/presentation/config/sandbox.config';
import { expectCleanRun, test } from './support/sandbox';

/**
 * Faults real players hit, each while a trick is in flight: a connection superseded by the
 * server (close code 4000), an offline period with failing reconnects, full-state storms,
 * storage that throws, a lost WebGL context, a hidden tab, and floods of emotes, chat and
 * timeout sounds. The table must recover and play on without replaying, losing or duplicating
 * cards, and without errors in the console.
 *
 * Pull requests run the smallest and largest table (the fewest and the most cards in flight when
 * the fault hits); the weekly run (E2E_FULL_MATRIX=1) runs every table size.
 */
const FAULT_SCENARIOS = [
  'superseded-close',
  'offline-online',
  'state-burst',
  'storage-throws',
  'context-loss',
  'background-tab',
  'social-burst-during-trick',
] as const;
const PLAYER_COUNTS = process.env.E2E_FULL_MATRIX === '1' ? SANDBOX_PLAYER_COUNTS : [3, 6];

for (const scenario of FAULT_SCENARIOS) {
  for (const playerCount of PLAYER_COUNTS) {
    test(`${scenario} with ${playerCount} players recovers cleanly`, async ({ sandbox }) => {
      expectCleanRun(await sandbox.run({ scenario, playerCount }));
    });
  }
}
