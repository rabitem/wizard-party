# Level-4 integration suites

Several players' real game clients against the real `GameRoom`, in one process, on vitest fake
timers. Use this level when a contract needs the client's state, its retries or what each player's
screen shows (see
[boundaries.md](../../.claude/skills/test-audit/references/boundaries.md)). Server-only contracts
belong to the room harness (`party/test-support/`), rules to the domain. Run the suites with
`npm test -- test/integration`; the page on all test levels is
[docs/testing/testing.md](../../docs/testing/testing.md).

## What runs

- `support/full-stack-table.ts`: `FullStackTable.create({ seed, roomId?, network?, tableTiming?,
  tournament? })` installs fake timers, starts a seeded `RoomHarness` and connects every client
  socket to it. `tournament` (`{ tickets, results }`, as `RoomHarnessOptions['tournament']`) runs
  the room in match mode. `table.server` is the room (read its `game`, never drive it from a
  scenario) and `table.restartRoom()` evicts it and starts it again from its storage.
- `support/browser-profile.ts`: one browser as the client sees it: reconnect id, the seat token
  kept per room and the tournament tickets of its tabs.
- `support/player-client.ts`: one player's client, the production composition (`createGameClient`
  with `TableFeeds`) on a `LoopbackSocket`. Its driver methods (`join`, `addBot`, `start`, `bid`,
  `play`, `resolve`, `nextRound`, `chat`, `leave`, `dropConnection`, `playHere`, ...) only make
  moves the player's screen offers (`support/offers.ts`); `client.commands` sends anything,
  for a stale screen on purpose.
- `support/network.ts`: in-order, asynchronous delivery with seeded latency and jitter, `stall`,
  a blackholed (zombie) socket and `failNextConnects`.
- `support/instant-table.ts`: stands in for the 3D table (cards land, tricks are collected after
  `flightMs`/`bannerMs`, 0 by default).
- `support/screen-model.ts`: `view(client)` is what the player's screen shows, built with the
  production selectors (page, lobby view model, displayed table, playable cards, prompts, HUD
  standings, feeds).
- `support/seeded-moves.ts`: `playOffered` plays a game with seeded moves picked among the ones the
  screens offer, wider than the simplest-move policy of `playUntil`. The room must accept each one.
- `support/invariants.ts`: I1-I6, checked by every `settle()`, read from the room and never from
  the client under test:

  | Id | Invariant |
  | --- | --- |
  | I1 | Hidden information: no frame shows another seat's hand, carries a `password` or `kickedPlayerIds` field or carries another seat's session token, and hidden bids stay hidden while bids are collected |
  | I2 | Snapshot versions never go backwards on a connection |
  | I3 | Convergence: a connected client holds exactly the projection the room would send its seat now |
  | I4 | Rule agreement: a connected client offers exactly the cards the room accepts from its seat |
  | I5 | No unexpected refusal: no `ERROR` frame and no shown error unless the scenario expected it |
  | I6 | Presentation integrity: no trick presented twice, no landed card flying in again in one trick |

## Writing a scenario

```ts
import { afterEach, expect, it } from 'vitest';
import { GamePhase } from '@shared/domain';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable } from './support/full-stack-table';
import { view } from './support/screen-model';

let table: FullStackTable | null = null;
afterEach(() => { table?.dispose(); table = null; });

it('names the contract the players see', async () => {
  const created = await FullStackTable.create({ seed: 11, network: { latencyMs: 30, jitterMs: 20 } });
  table = created;
  const ann = created.open(created.browser(), 'Ann');
  await ann.join({ name: 'Table', isPublic: false, maxPlayers: 6, rulesetConfig: ruleset({ rounds: 2 }) });
  const ben = created.open(created.browser(), 'Ben');
  await ben.join();
  ann.addBot(2);
  await created.settle(); // the bot's seat reaches Ann's lobby; only then does it offer "start"
  ann.start();
  await created.playUntil(() => created.server.game.phase === GamePhase.ROUND_END);
  const seatBefore = ben.seatId;
  ben.dropConnection();
  await created.settle(); // the reconnect backoff runs on the fake clock
  expect(view(ben).seatId).toBe(seatBefore);
});
```

- Move time only through the table: `settle()` (until no frame is in flight, no bot turn is
  scheduled and every client is connected or has given up, with no undecided play and its trick
  presentation idle; waiting on a human, a round end or a pause counts as rest; then I1-I6),
  `advance(ms)`, `playUntil(done)`. Never real timers.
- `table.browser()` is a new browser (reconnect id, seat tokens, tickets). Open two tabs of one
  browser with the same profile; a private window is a new profile.
- Expected values come from the rules or from the room (`table.server.game`), never from the
  client under test. Name time with the configured constants (`ROOM_TIMING`, `RECONNECT_POLICY`,
  `CONNECTION_LIVENESS`), never with literals.
- The seed fixes the deal, the bots, the jitter and the reconnect jitter. Assert invariants and
  rules, not the cards a seed happens to deal. A scenario that needs a situation (a Wizard lead,
  a tie) runs `it.each` over a few seeds and asserts a precondition counter, so its name never
  promises what the input did not exercise.
- A refusal or error the scenario provokes is declared first with `client.expectRefusal(code or
  message)`; any other one fails I5. `settle({ invariants: false })` only while a fault is still
  being set up, followed by a checked `settle()`.
- One table hosts one room (`table.roomId`). Call `table.dispose()` in `afterEach`.
- Files are `test/integration/<flow>.integration.test.ts`; shared helpers go into `support/`. A
  fixture that only one flow's files use sits beside them (`connection-faults.fixtures.ts`).
