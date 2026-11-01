import { SANDBOX_PLAYER_COUNTS } from '../src/presentation/config/sandbox.config';
import { expectCleanRun, test } from './support/sandbox';

/**
 * Connection loss and degraded networks: drops mid-trick and across a trick completion, message
 * stalls (throttled tabs) delivered as one burst, and slow, jittery links. The table must keep
 * its state through the drop, never replay landed cards and never lose or duplicate a trick.
 *
 * Pull requests run the smallest and largest table; the weekly run (E2E_FULL_MATRIX=1) runs every
 * table size.
 */
const NETWORK_SCENARIOS = [
  'reconnect-mid-trick',
  'reconnect-missed-trick-complete',
  'stall-burst',
  'high-latency',
] as const;
const PLAYER_COUNTS = process.env.E2E_FULL_MATRIX === '1' ? SANDBOX_PLAYER_COUNTS : [3, 6];

for (const scenario of NETWORK_SCENARIOS) {
  for (const playerCount of PLAYER_COUNTS) {
    test(`${scenario} with ${playerCount} players recovers cleanly`, async ({ sandbox }) => {
      expectCleanRun(await sandbox.run({ scenario, playerCount }));
    });
  }
}
