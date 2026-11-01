import { expectCleanRun, test } from './support/sandbox';

/**
 * Faults real players hit, each while a trick is in flight: a connection superseded by the
 * server (close code 4000), an offline period with failing reconnects, full-state storms,
 * storage that throws, a lost WebGL context, a hidden tab, and floods of emotes, chat and
 * timeout sounds. The table must recover and play on without replaying, losing or duplicating
 * cards, and without errors in the console.
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

for (const scenario of FAULT_SCENARIOS) {
  test(`${scenario} recovers cleanly`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario, playerCount: 4 }));
  });
}
