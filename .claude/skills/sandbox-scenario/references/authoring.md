# Writing a scenario

Types: `SandboxScenario` and `SandboxRunConfig` in `sandbox.types.ts`, `SandboxStep` and
`WaitCondition` in `sandbox-step.types.ts` (both in `src/presentation/components/sandbox/`).

```ts
{
  id: 'sort-during-collection',       // unique kebab-case; test titles and --grep use it
  title: 'Sort the hand while the trick is being collected, shuffle right after',
  covers: ['hand-sort', 'hand-shuffle', 'collection'],
  table: { leadSeat: 1, round: 5 },
  steps: [
    ...playOnTurn(),
    { op: 'wait-for', until: 'collecting' },
    { op: 'sort' },
    { op: 'wait-for', until: 'trick-collected' },
    { op: 'shuffle' },
    { op: 'wait-for', until: 'hand-idle' },
    { op: 'wait-for', until: 'idle' },
  ],
}
```

## Table

`buildSandboxTable` (`sandbox-run-support.ts`) turns `table` into a `SandboxTableConfig`. Seat 0
is always the local player. Defaults: round 3, seed 7, `leadSeat: 1`, `startPhase: 'PLAYING'`.
The player count comes from the run config (`playerCount`, default 4), never from the scenario.

| Field | Use |
| --- | --- |
| `leadSeat` | `0` to lead yourself, `1` or higher to let opponents throw first |
| `round` | Cards per player; `'max'` deals 60 / players, the layout worst case |
| `startPhase` | `'TRUMP_SELECTION'`, `'BIDDING'` or `'PLAYING'` |
| `hands` | Exact card ids per seat, e.g. `{ 0: ['WIZARD-0', 'JESTER-0', 'GIANTS-9'] }`; other seats are dealt from the seed |
| `trumpSuit` | A `Suit` from `@shared/domain` |
| `customRoundCount` | A shorter game, so `GAME_END` is reachable (`game-end` uses 1) |

Run config (`SandboxRunConfig`): `scenario` (id or inline object), `playerCount`, `seed`,
`settings` (`cardTheme`, `tableTheme`, `theme`, `collectionAnimation`, `cardNumberSize`),
`settleMs`, `interactive`, and `id` for a readable report name when one test runs a scenario more
than once.

## Steps

Bots play by themselves at production pace once the client is ready. For exact interleavings,
switch them to `{ op: 'bots', mode: 'manual' }` and release moves with `{ op: 'bot-play', count }`
(see `bot-burst`, `reconnect-missed-trick-complete`).

- `play` picks a playable card (`first` by default, `last`, `random`, `wizard`, `jester`,
  `number` or an exact id) and throws when there is none, so put `wait-for local-turn` before it:
  `playOnTurn(step)` does. `via` defaults to `double-tap` through the 3D hand; `command` skips the
  hand and its launch pose. The step waits up to 1.5 s for the card to leave the hand, except for
  `drag-cancel`, `drag-interrupt` and `drag-second-finger`, which must leave it there.
- `pointer: 'auto'` uses touch on a coarse-pointer device and mouse elsewhere; force `'touch'` for
  touch scenarios that must also run on desktop projects.
- `settings` takes setting ids or `'next'`. `bid` defaults to 0, or 1 when 0 is forbidden.
- `repeat` nests steps; `describeStep` labels each executed step in the timeline.

| `wait-for` | Holds when |
| --- | --- |
| `local-turn` | The UI would accept your card now: your turn, a playable card, no trick result or animation locking input |
| `all-landed` | The next all-cards-landed event after the step started |
| `collecting` | A collecting card is in the scene (a state, true at once if already collecting) |
| `trick-collected` | The next collection completes after the step started |
| `idle` | 30 consecutive frames with nothing queued, scheduled or moving |
| `hand-idle` | No hand animation (deal, shuffle, sort) |
| `connected` | Connected again after the last drop, close or offline step |
| `round-end` | Phase `ROUND_END` or `GAME_END` |
| `bidding` | Phase `BIDDING` and your turn |
| `playing` | Phase `PLAYING` |

The default timeout is `SANDBOX_AUDIT.WAIT_TIMEOUT_MS` (15 s virtual). A full round needs an
explicit `timeoutMs` (the capture scenarios use 240 000); reconnects after failed attempts need
room for the client's backoff (the fault scenarios use 20 000).

## Checkpoints, snapshots and holds

- `checkpoint`: draws a frame, then runs the full layout and playability audit on it. The clock
  keeps running. Use it to judge the screen at a moment of the flow (`max-hand` checks bidding,
  your turn and a full trick).
- `snapshot`: pauses the clock, waits in real time for three.js loaders, renders
  `SNAPSHOT_SETTLE_FRAMES`, audits like a checkpoint and records `SceneFacts` (camera, objects per
  kind, renderer state, inventory) in `report.snapshots`. `image: true` adds a PNG data URL.
  Labels accept `{cardTheme}`, `{tableTheme}`, `{theme}`, `{collectionAnimation}` and
  `{cardNumberSize}`, so a snapshot inside a `repeat` names each theme it visits.
- `hold: true` on a snapshot parks the run until the driver releases it, but only with a driver
  attached (`interactive: true`) and a pausable clock. `status().held` reports `{ kind, label }`.
  No release within `HOLD_TIMEOUT_REAL_MS` (120 s real) raises `hold-timeout`.
- `external`: switches the clock to real pace and holds while the driver sends real input. Without
  a driver it is skipped (timeline: `external-skipped`).

The driver side is `sandbox.runInteractive` from `e2e/support/sandbox.ts`. It polls `status()`,
hands each hold to the callback and releases it in a `finally`, so the callback never releases:

```ts
const report = await sandbox.runInteractive({ scenario: 'room-tour', playerCount: 4 }, async (hold) => {
  if (hold.kind !== 'snapshot') return;
  await expect.soft(page).toHaveScreenshot(`${hold.label}.png`, { /* VISUAL_BUDGETS */ });
});
expectCleanRun(report);
```

For real input inside an `external` hold, aim with `window.__wizardSandbox.handCardPoint()` and
`tablePoint()` and wait with `expect.poll` in the test process (`e2e/input.spec.ts`).

New snapshot labels have no baseline yet: `e2e/visual.spec.ts` annotates `missing-baseline` and
skips them. Baselines come only from CI (dispatch with `update_snapshots`); mask animated DOM with
`data-visual-mask` (`VISUAL_BUDGETS.MASK_SELECTORS`).

## Measurement windows

`measure-start` and `measure-end` with the same label produce `report.metrics.windows[label]`:
render statistics (draw calls, shadow draws, triangles, uploads, shader links, CPU, GPU and frame
cost) and React commit counts. An end without an open window fails the step. Assert windows with
the helpers in `e2e/support/budgets.ts` (`expectIdleBudgets(report, label)`,
`expectWarmRoundBudgets`, `expectResourceBudgets`). A new budget is a constant in
`sandbox-budgets.config.ts` plus an assertion in `budgets.ts`.

## A new step op

Only when no existing op expresses the action. Add the variant to `SandboxStep`; the compiler then
asks for its handler through `StepHandlerMap` in one group: core ops in `sandbox-step-runner.ts`,
capture ops in `sandbox-capture-steps.ts`, faults in `sandbox-fault-steps.ts`. Give it a label in
`describeStep` and a row in the Step ops table of `docs/testing/sandbox-framework.md`.
