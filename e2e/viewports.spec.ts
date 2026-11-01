import { expectCleanRun, test } from './support/sandbox';

/**
 * Playability per device project and table size: each project is a device or window, and every
 * player count plays a round transition, a full hand by drag, and the largest hand the table size
 * deals (60 / players cards) audited while bidding, on the player's turn and with a full trick on
 * the table. A run fails when controls render off screen, the page scrolls, hand cards sit outside
 * the viewport or are too narrow to tap, 3D labels are unreadable, HUD panels overlap each other
 * or the cards, or something blocks the camera's view of the table.
 */
const PLAYER_COUNTS = [3, 4, 5, 6] as const;

for (const playerCount of PLAYER_COUNTS) {
  test(`${playerCount} players: a round transition fits the viewport`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario: 'round-transition', playerCount }));
  });

  test(`${playerCount} players: a full hand can be played by drag`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario: 'lead-drag-throw', playerCount }));
  });

  test(`${playerCount} players: the largest hand is playable`, async ({ sandbox }) => {
    expectCleanRun(await sandbox.run({ scenario: 'max-hand', playerCount }));
  });
}
