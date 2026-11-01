# Animation sandbox

The sandbox plays the production client with its 3D table against the production `GameRoom`,
hosted in the same browser tab, on a deterministic clock. Scripted scenarios drive it and every
run ends in an audit report. The Playwright suites assert on that report. Read this page before
you add a scenario, a step, a budget or a playability check. Running the suites, CI and budgets are
in [testing.md](testing.md); the room the loopback server hosts is described in
[../server/room.md](../server/room.md), the client it drives in
[../client/connection.md](../client/connection.md).

## How it works

```
e2e/*.spec.ts ── support/sandbox.ts   fixture: clock, profile, React hook init script, holds
      │          support/budgets.ts   budget assertions over report windows
      ▼
window.__wizardSandbox ── sandbox-agent-api.ts
      ▼
SandboxController ── run lifecycle: mount, ready, steps, settle, report
  ├─ SandboxStepRunner ── StepHandlerMap = core ∪ capture ∪ faults (one handler per op but `repeat`)
  │    ├─ sandbox-capture-steps.ts   snapshot, external, measure-start, measure-end
  │    └─ sandbox-fault-steps.ts     close-socket, take-over-seat, offline, online, state-burst,
  │                                  storage-fault, lose-context, visibility, social
  ├─ SocketFaults (wraps the socket factory) · BrowserFaults (navigator, document, Storage,
  │    WEBGL_lose_context)
  ├─ SandboxHoldGate ── the hand-over point between a run and its driver
  ├─ AnimationAuditRecorder ── motion and lifecycle invariants, RunRenderLedger, windows, snapshots
  └─ auditScreen (playability-audit.ts) ── SceneScreenModel + HUD regions -> playability anomalies
      ▲
SceneAnimationProbe (inside the Canvas) ── useRenderInstrumentation (GlInstrumentation,
                                            GpuFrameTimer), LoadingTracker, scene bridge
                                            (captureFrame, pendingLoads)
```

The controller, the probe and the audits are in `src/presentation/components/sandbox/`. The
page is `src/app/sandbox/animations/` (`sandbox-app.tsx` is the composition root: it installs the
clock before any game module schedules a timer, then mounts `AnimationSandbox` with a
`LoopbackGameServer`). The clocks and the server are in `src/infrastructure/sandbox/`.

### Availability

`src/app/sandbox/animations/page.tsx` serves the route in development, on Vercel preview
deployments and in a build made with `NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX=1` (`npm run e2e:build`).
Any other production build answers 404.

### The loopback game server

`LoopbackGameServer` (`src/infrastructure/sandbox/loopback-game-server.ts`) runs the real
`GameRoom` in the page: the same command pipeline, handlers, bot scheduler, pause and reconnect
handling, alarms and event order as the worker. Only the transport is simulated.

| Piece | Path | Role |
| --- | --- | --- |
| `LoopbackGameServer` | `src/infrastructure/sandbox/loopback-game-server.ts` | Implements the `SandboxServer` port (`sandbox.types.ts`): network shaping, stalls, drops, bot pacing, state resend |
| `LoopbackRoomHost` | `src/infrastructure/sandbox/loopback-room-host.ts` | The room's connections and in-memory storage; the room's alarm is a timer on the sandbox clock |
| `LoopbackSocket` | `src/infrastructure/sandbox/loopback-socket.ts` | In-memory `GameSocket` with an asynchronous open and close, and the `FaultableSocket` faults |
| `createSandboxGame` | `src/infrastructure/sandbox/sandbox-table-setup.ts` | Builds the scenario's table (round, phase, hands, trump) for the room to adopt |

The server is built for animation scenarios and is not a test harness for server or client
contracts:

- It deals the scenario's table with one local seat (seat 0, named "You"); every join is that
  seat's, and the other seats are bots.
- It serves that one seat: a newer socket supersedes the older one, as in production.
- Server contracts belong to the room harness (`party/test-support/room-harness.ts`), and
  client-and-server flows to the in-process full stack
  ([test/integration/README.md](../../test/integration/README.md)).

Randomness is seeded: the room's entry points run under `withSeededRandom`, so a replay deals and
decides the same way. The default seed is `SANDBOX_DEFAULTS.SEED` in
`src/presentation/config/sandbox.config.ts`.

## Using the sandbox

Open `/sandbox/animations` in a dev build (`npm run dev`) or a production build made with
`npm run e2e:build`. The control panel runs any registered scenario with a player count and a seed,
lists the anomalies and copies the report JSON.

| Parameter | Effect |
| --- | --- |
| `clock=play` (default) | Virtual clock at real pace |
| `clock=fast` | Virtual clock, frames back to back (what the suites use) |
| `clock=paused` | Virtual clock stepped by hand |
| `clock=real` | Wall-clock frames: real frame timing, not deterministic |
| `perf=1` | Perf profile: the probe samples cards every Nth frame (`probe=N` to change it), motion checks are off unless N is 1, the React hook counts commits but not renders |
| `ui=0` | Hide the control panel |

The choice between the virtual and the real clock, and the perf profile, are fixed for the life of
the page; `clock.mode` changes the mode of the virtual clock. The perf profile constants
(`SANDBOX_PERF_PROFILE`) are in `src/presentation/config/sandbox-budgets.config.ts`.

### The agent API

`window.__wizardSandbox` (`WizardSandboxApi` in `sandbox-agent-api.ts`, `version: 2`) is the
contract for the Playwright fixture, `scripts/animation-audit.mjs` and agents. Everything it
returns is JSON-serialisable.

| Member | Returns |
| --- | --- |
| `run(config)`, `runMany(configs)` | The `AuditReport`s. `config.scenario` is an id or an inline scenario object; `playerCount`, `seed`, `settings`, `settleMs` and `interactive` are optional |
| `status()` | `status`, `runId`, `scenario`, `step`, `anomalies`, `held` (the snapshot or external step the run waits on) and `lastReport` |
| `release(label?)` | Lets a held run continue; with a label, only a hold of that label |
| `lastReport()`, `stop()` | The last report; abort the run |
| `game()` | Phase, hand, playable ids and animation flags of the mounted game |
| `handCardPoint(cardId?)`, `tablePoint()` | Client coordinates where a tap or a throw aims |
| `clock.mode(mode, speed?)`, `clock.step(frames?)`, `clock.stats()` | Control of the virtual clock |
| `canvasSnapshot()` | PNG data URL of the next rendered frame |
| `drawBreakdown()` | Draw calls and shadow casters per owner, biggest first (an estimate) |
| `dimensions()` | Every value of every audit axis: card, table and UI themes, collection modes, card number sizes, scenarios, `SANDBOX_VIEWPORTS`, player counts |

One run at a time per page. DOM commit counts are `null` in a page opened by hand: only the
Playwright fixture installs the React hook before React loads, so the hook then sees R3F only.

### Scenarios

A scenario (`SandboxScenario` in `sandbox.types.ts`) is an id, a title, a `covers` list, an optional
table setup and a list of steps. The scenarios are in
`src/presentation/components/sandbox/sandbox-scenarios*.ts`, and `sandbox-scenario-registry.ts`
lists them by group in `SCENARIO_GROUPS`:

- **`animation`**: throws, landings, collections, hand shuffle and sort, special cards, round and
  game transitions, reconnects, stalls and latency.
- **`faults`**: `superseded-close`, `offline-online`, `state-burst`, `storage-throws`,
  `context-loss`, `background-tab`, `social-burst-during-trick`.
- **`playability`**: `max-hand` (the largest hand the table size deals, audited while bidding, on
  the player's turn and with a trick on the table), `touch-drag-throw`, `second-finger-drag`,
  `real-touch-play`.
- **`long`**: `theme-sweep`, `perf-round`, `render-budget`, `idle-table-10s`, `room-tour`.

`real-touch-play` needs a driver for the real input; without one its `external` step is skipped.
The batch runner in `scripts/animation-audit.mjs` keeps its own lists of long, driver and fault
scenarios (`LONG_SCENARIOS`, `DRIVER_SCENARIOS`, `FAULT_SCENARIOS`, `INPUT_SCENARIOS`) that decide
which presets run them.

### Step ops

`SandboxStep` (`sandbox-step.types.ts`) is the vocabulary of a scenario.

| Group | Ops |
| --- | --- |
| Play | `play` (`via`: `command`, `double-tap`, `drag-throw`, `drag-slow`, `flick`, `drag-cancel`, `drag-interrupt`, `drag-second-finger`; `pointer`: `auto`, `mouse`, `touch`), `bid`, `select-trump`, `next-round`, `autoplay`, `bots`, `bot-play`, `shuffle`, `sort`, `settings` |
| Timing | `wait`, `wait-for` (conditions are `WaitCondition`), `repeat` |
| Network | `network` (latency, jitter), `stall`, `drop-connection`, `close-socket` (any code; 4000 is superseded), `take-over-seat` ("Play here" after a superseded close), `offline`, `online`, `state-burst` |
| Device | `storage-fault` (`throw`, `quota`, `off`), `lose-context`, `visibility` |
| Social | `social`: emotes, chat lines or timeout sounds in the opponents' names |
| Capture | `checkpoint` (full playability audit), `snapshot` (freeze, audit, record scene facts, optional image, optional hold), `external` (hand control to the driver), `measure-start` and `measure-end` |

With the `auto` pointer, synthetic gestures use touch pointers on a coarse-pointer device. Touch
pointers have their own pointer ids, and a second finger has `isPrimary: false`.

### Fault injection

Faults act on the client's side of the loopback, so the production client and room handle them with
their own code.

- **Socket faults** (`SocketFaults`, `socket-faults.ts`). The `FaultableSocket` port
  (`sandbox.types.ts`) is what the loopback socket offers: a server-side close with any code, a
  connection attempt that fails before it opens, and raw message injection. `SocketFaults` wraps
  the socket factory, so it always holds the socket the client uses.
- **Browser faults** (`BrowserFaults`, `browser-faults.ts`). `navigator.onLine` with the `online`
  and `offline` events, `document.visibilityState`, `Storage` that throws or hits its quota, and a
  lost and restored WebGL context. A run reverts them before it builds its report.
- **Server faults** (`SandboxServer`). Latency and jitter, `stall` (hold every message, then
  deliver one burst), `dropConnection`, and `broadcastState` for full-state storms.
- **Social floods.** `social` injects emote, chat and timeout-sound events through `SocketFaults`.

Defaults of the fault steps are `SANDBOX_FAULTS` in `src/presentation/config/sandbox.config.ts`.

### What a report checks

`report.anomalies` lists every finding, each with a code and a severity from
`ANOMALY_SEVERITY` (`audit-log.ts`). A run passes (`report.passed`) when no anomaly is a `warn` or
an `error`.

- **Motion and lifecycle.** Teleports, path kinks, rotation pops, handoff seams, double renders,
  stuck or skipped animations, trick lifecycle order.
- **Page layout** (at `checkpoint` and `snapshot` steps and at the end of a run). Page overflow and
  controls off screen.
- **Playability** (at `checkpoint` and `snapshot` steps, `playability-audit.ts`). Hand cards outside
  the viewport or narrower than the tap budget, translucent hand cards while the player reads them,
  3D labels below the legibility budget for the form factor, HUD panels overlapping each other or
  covering played cards, labels or the hand, blocked sight lines from the camera to the table, and
  untextured square particles.
- **Environment.** `webgl-unavailable` (with the GL error) replaces a generic readiness timeout
  when the renderer could not start. `software-renderer` is informational.
- **Faults.** `context-not-restored` when the table does not draw again after a context loss, and
  `hold-timeout` when a driver never released a hold.

Windows opened with `measure-start` and `measure-end` are in `report.metrics.windows`, each with
render statistics (draw calls, shadow draws, triangles, uploads, links, CPU, GPU and frame-cost
distributions) and React commit counts. The `render-budget` scenario plays a warm-up round,
measures an idle table (window `idle`), then a whole warm round (window `warm-round`); the
constants are `RENDER_BUDGET_SCENARIO` in `sandbox-budgets.config.ts`. Add windows to any scenario
with the two steps.

HUD panels are found through `data-hud-region="<name>"` attributes when the page has any, and are
inferred from positioned layers that draw a panel or hold controls otherwise (`hud-regions.ts`,
`HUD_REGIONS`). Full-screen overlays are left out, and so are DOM labels anchored in the 3D scene
(drei `<Html>`, which portals into the R3F canvas container).

## Contracts

- **Counts over timings.** Budgets that gate CI are counts: draw calls, shadow draws, uploads,
  shader links, React commits. They are deterministic on the virtual clock and identical under
  software rendering. Frame-time budgets exist and run on real hardware only.
- **Every run starts from a fresh client.** Warm-scene numbers come from measurement windows inside
  one run (a warm-up round, then a measured round), not from keeping the scene across runs.
- **Perf profile.** `?perf=1` samples card transforms every Nth frame, turns off per-frame motion
  checks when N is above 1 (strided steps are not motion bugs) and stops the React hook from
  walking the fiber tree.
  Per-frame render counters stay on. The probe times its own work (`probeMs`) and the frame's work
  up to the probe (`cpuMs`), so its cost is reported apart. GPU time comes from
  `EXT_disjoint_timer_query_webgl2` where the browser has it.
- **Production GL attributes.** The probe reads frames inside the render callback that drew them
  (`captureFrame`), so the canvas needs no `preserveDrawingBuffer` and the sandbox renders with the
  game's own context attributes.
- **Holds.** A snapshot freezes the virtual clock, waits for three.js loaders, renders
  `SNAPSHOT_SETTLE_FRAMES` frames, audits the screen and records scene facts: camera, card counts
  per owner, renderer state, inventory. With a driver attached (`interactive: true`) it holds until
  released. `external` steps run the clock at real pace while the driver sends real input. Without
  a driver, snapshots run through and `external` steps are skipped. On `clock=real` the clock
  cannot pause, so a snapshot is taken in flight and never held. Releases are event-driven;
  timeouts use `clock.realDelay`, which never drives frames.
- **Screen model.** `scene-screen-model.ts` projects hand and played cards, 3D labels (troika text,
  em height with foreshortening) and raycasts from the camera to the felt. Cards are content, never
  occluders, and translucent or hidden geometry is looked through. `hud-regions.ts` finds the HUD
  panels. The checks in `playability-audit.ts` are pure comparisons against `PLAYABILITY_BUDGETS`,
  on rectangles from `screen-geometry.ts`.
- **Aiming at hand cards.** Synthetic gestures and `handCardPoint()` aim where the card is visible
  (`hand-hit-test.ts`): its centre when nothing covers it, otherwise the middle of the strip its
  fanned neighbours leave, checked with the nearest-hit raycast R3F uses. A tap at the centre of a
  covered card would land on its neighbour (20-card hands at three players).
- **Loads.** `LoadingTracker` wraps `THREE.DefaultLoadingManager` and counts loads per URL, so a
  load that started before the probe mounted cannot settle one the snapshot waits for.
- **A simulated game never reaches real APIs.** The Playwright fixture and the batch runner answer
  `**/api/**` with 204.

## Playwright support

`e2e/support/` holds what every spec shares.

| File | Provides |
| --- | --- |
| `e2e/support/sandbox.ts` | `test`, the Playwright test with a `sandbox` fixture; `expect`; `expectCleanRun(report)` |
| `e2e/support/budgets.ts` | `expectIdleBudgets`, `expectWarmRoundBudgets`, `expectResourceBudgets`, `expectFrameBudgets`, `expectWarmFrameBudget`, `describeWindows` |

The `sandbox` fixture opens `/sandbox/animations?clock=<clock>&ui=0` (plus `&perf=1` for the perf
profile), installs the React commit hook as an init script, answers `**/api/**` with 204 and waits
for `window.__wizardSandbox`. Set the clock and profile per file with
`test.use({ clock: 'real', profile: 'perf' })`; the defaults are `fast` and `audit`.

- `sandbox.run(config)` runs a scenario and attaches the report as JSON, the WebGL renderer as an
  annotation and, for a failing run, a screenshot.
- `sandbox.runInteractive(config, onHold)` runs with a driver attached: every held snapshot or
  external step goes to `onHold`, then is released. `visual.spec.ts` compares screenshots there,
  and `input.spec.ts` sends real touch input.
- `sandbox.dimensions()` is `dimensions()` of the agent API.
- `expectCleanRun(report)` fails on any anomaly that is not `info`, and prints each finding. It is
  the default assertion. The budget helpers use soft assertions, so one report shows every budget
  it misses.

## Adding things

- **A scenario.** Add it to a group file (`sandbox-scenarios.ts`, `sandbox-scenarios-capture.ts` or
  `sandbox-scenarios-faults.ts`) and the group to `SCENARIO_GROUPS` in
  `sandbox-scenario-registry.ts`. Then add its id to the list of the spec that owns its kind
  (`CORE_SCENARIOS`, `NETWORK_SCENARIOS`, `FAULT_SCENARIOS` or `SYNTHETIC_TOUCH_SCENARIOS` in
  `e2e/`). Update the batch lists in `scripts/animation-audit.mjs` when the scenario is long,
  fault or input. The registry test checks unique ids and balanced measurement windows. The
  workflow is in the [sandbox-scenario skill](../../.claude/skills/sandbox-scenario/SKILL.md).
- **A step op.** Add it to `SandboxStep` (`sandbox-step.types.ts`). The compiler then asks for a
  handler in one of the handler groups. Give it a readable label in `describeStep`
  (`sandbox-run-support.ts`); without one the timeline shows the bare op name.
- **A budget.** Add the constant to `sandbox-budgets.config.ts` and an assertion in
  `e2e/support/budgets.ts`. If it needs another counter, add it to `RenderSample` (from the probe) or
  to `ReactCommitTotals`.
- **A playability check.** Extend `SceneScreenModel` or `collectHudRegions`, add an `AnomalyCode`
  (`sandbox.types.ts`) with its severity in `ANOMALY_SEVERITY` (`audit-log.ts`), and add the
  comparison to `playability-audit.ts`.
- **A fault.** Add the op (see "A step op"), put its handler in `sandbox-fault-steps.ts`, and
  implement the mechanism in `SocketFaults`, `BrowserFaults` or the `SandboxServer` port.
- **A viewport.** Add it to `SANDBOX_VIEWPORTS` in `src/presentation/config/sandbox.config.ts` with
  its form factor. The matrix spec picks it up in the weekly full run; add its id to `KEY_VIEWPORTS`
  in `e2e/playability-matrix.spec.ts` to run it on pull requests.

## Tests

The sandbox's own logic has unit tests next to the sources in
`src/presentation/components/sandbox/*.test.ts` and `src/infrastructure/sandbox/*.test.ts`; they run
with `npm test`. The loopback server's tests
(`src/infrastructure/sandbox/loopback-game-server.test.ts`) prove the production join, the
superseded close, pause, ordering and resync. The scenarios themselves run only in a browser, in
the specs listed in [testing.md](testing.md#browser-suites-levels-5-and-6).
