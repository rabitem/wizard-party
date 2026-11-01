import { expectCleanRun, test } from './support/sandbox';

/**
 * Connection loss and degraded networks: drops mid-trick and across a trick completion, message
 * stalls (throttled tabs) delivered as one burst, and slow, jittery links. The table must keep
 * its state through the drop, never replay landed cards and never lose or duplicate a trick.
 */
const NETWORK_SCENARIOS = [
  'reconnect-mid-trick',
  'reconnect-missed-trick-complete',
  'stall-burst',
  'high-latency',
] as const;

for (const scenario of NETWORK_SCENARIOS) {
  for (const playerCount of [3, 6] as const) {
    test(`${scenario} with ${playerCount} players recovers cleanly`, async ({ sandbox }) => {
      expectCleanRun(await sandbox.run({ scenario, playerCount }));
    });
  }
}
