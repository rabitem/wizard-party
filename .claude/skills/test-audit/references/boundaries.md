# Test boundaries and their cost

Pick the cheapest boundary that can observe the contract. Move up a level only when the lower one
cannot see the risk.

| Level | Where | Sees | Cost |
| --- | --- | --- | --- |
| 1. Domain | `shared/domain/**` next to the source | Rules, scoring, legal plays, bids, bot decisions, value objects | Milliseconds. Table-driven. |
| 2. Use case | `shared/application/use-cases/**` | One command applied to the aggregate, with in-memory ports | Milliseconds. |
| 3. Room harness | `party/test-support/room-harness.ts` | The real `GameRoom`: command pipeline, sessions, protocol, bots, alarms, pause, reconnect, restart from storage. Time is vitest fake timers. | Fast. The default for anything server-side. |
| 4. Full stack in process | `test/integration/*.integration.test.ts` on `test/integration/support/` (`FullStackTable`: several production game clients, `createGameClient` + `TableFeeds`, on `LoopbackSocket`s against a seeded `RoomHarness`; see `test/integration/README.md`) | Real clients and the real room together over a shaped network: latency, stalls, drops, zombie and superseded sockets, restarts; what each player's screen shows; invariants I1-I6 at every rest | Fast. The default for client and server flows: lobby to game end, reconnect, command acknowledgements, state sync. The sandbox's single-seat `loopback-game-server.ts` is not a test harness. |
| 5. Sandbox in a browser | `/sandbox/animations`, `window.__wizardSandbox`, scenarios in `components/sandbox/` | The production client rendered with WebGL: animations, layout, input, faults | Minutes per scenario on CI (software WebGL). |
| 6. Playwright | `e2e/*.spec.ts` | Real engines and devices, screenshots, budgets | Runner hours for the full matrix. Narrow `grep` only. |
| Smoke | `scripts/realtime-smoke.mjs` on CI against `wrangler dev` | The deployed worker shape: routing, upgrade, health | One CI step. |

## Choosing

- Pure function with rules in it: level 1. Table rows for each case, one `it.each`.
- "When the player does X, everyone sees Y": level 3 if only the server matters, level 4 if the
  client's state or its retries matter.
- Timing, timeouts, pause, alarms: level 3 with fake timers. Never real `setTimeout` waits.
- Pixels, layout, animation continuity, pointer input: level 5 through a scenario, asserted in
  level 6. Not jsdom.
- React components: test the hook or the pure helper behind them. Render tests only for a
  contract that lives in the markup (accessibility names, what is shown to which player).
- Next.js API routes: call the route handler with a `Request` and in-memory adapters for the
  ports. Never the production database or Upstash.

## Fixtures

- Build games through the domain (`createGame`, use cases) or the room harness, not by writing
  state objects by hand. Hand-written state drifts from what the server produces.
- Share setup through the owner's fixture module. Copy-pasted setup across files is a smell to
  consolidate.
- Seeds and timestamps are constants in the test (`HARNESS_START_TIME`).
