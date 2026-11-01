---
name: sandbox-scenario
description: "Use when adding, changing or debugging an animation sandbox scenario in Wizard Party and asserting it in the Playwright suites: animation continuity, trick lifecycle, layout and playability, pointer or touch input, network and device faults, render or React budgets, visual baselines. Covers scenario steps and wait-for conditions, checkpoints, snapshots, holds, measurement windows, reading an AuditReport (anomalies, timeline, windows), running one scenario at /sandbox/animations or through window.__wizardSandbox, and running it on CI with a narrow e2e.yml grep."
---

# Sandbox scenario

A scenario is a scripted session of the production client against the real `GameRoom`, hosted in
the browser (`src/infrastructure/sandbox/loopback-game-server.ts`) on a virtual clock. Every run
ends in an `AuditReport`; the Playwright suites in `e2e/` assert that report. Usage is in
`docs/testing/testing.md`, the design in `docs/testing/sandbox-framework.md`.

- Writing steps, table setup, checkpoints, snapshots, holds, windows: [authoring.md](references/authoring.md).
- Running one and reading its report: [running.md](references/running.md).
- A run flakes, times out or misses its target: [pitfalls.md](references/pitfalls.md).

## Is a scenario the right proof?

Pass the authoring gate in `.claude/skills/test-audit/SKILL.md` first. A scenario costs minutes
per browser project on CI (software WebGL), so it only owns contracts that need the rendered client:

- animation continuity and trick lifecycle order: throws, landing, collection, hand shuffle and
  sort, round and game transitions;
- layout and playability on a viewport: tap targets, legibility, HUD overlap, occlusion;
- pointer and touch input on the 3D hand;
- the rendered table recovering from a network or device fault;
- render and React counts (`src/presentation/config/sandbox-budgets.config.ts`), visual baselines.

Not a scenario: rules and scoring (domain tests), server state and timing (room harness,
`party/test-support/room-harness.ts`), client state sync, acknowledgements and reconnect logic
that does not depend on rendering (loopback full stack; see the test-audit `boundaries.md`).

Before writing a new one, read `SCENARIO_GROUPS` in
`src/presentation/components/sandbox/sandbox-scenario-registry.ts`. Running an existing scenario
at another `playerCount`, `settings` or viewport, or adding a step to it, is cheaper than a new
scenario. A regression scenario must fail before the fix with the anomaly code you expect, not
with `wait-timeout` or `step-failed`.

## Workflow

1. **Prototype** in the dev page: pass the scenario object inline to
   `window.__wizardSandbox.run({ scenario: { ... } })`. No file edits, no rebuild.
2. **Write it** in the group file of its kind: `sandbox-scenarios-faults.ts` (faults),
   `sandbox-scenarios-capture.ts` (playability, long, visual), `sandbox-scenarios.ts` (animation).
   `sandbox-scenarios.ts` is already over the 300-line limit: put new animation scenarios in a new
   `sandbox-scenarios-<topic>.ts` and register it in `SCENARIO_GROUPS`. Reuse `playOnTurn()` and
   `finishTrick` from `sandbox-scenarios.ts`.
3. **Assert it** by adding its id to the list of the suite that owns its kind. A new spec file is
   only for a new kind of assertion.

   | Kind | Spec and list | Test title |
   | --- | --- | --- |
   | Core animation | `e2e/scenarios.spec.ts`, `CORE_SCENARIOS` | `<id> plays cleanly` |
   | Drops, stalls, latency | `e2e/reconnect.spec.ts`, `NETWORK_SCENARIOS` (3 and 6 players) | `<id> with <n> players recovers cleanly` |
   | Network and device faults | `e2e/faults.spec.ts`, `FAULT_SCENARIOS` | `<id> recovers cleanly` |
   | Synthetic touch | `e2e/input.spec.ts`, `SYNTHETIC_TOUCH_SCENARIOS` | `<id> plays cleanly` |
   | Layout per table size | `e2e/viewports.spec.ts` (device projects), `e2e/playability-matrix.spec.ts` (`viewport-matrix`) | per player count |
   | Budgets | `e2e/render-budget.spec.ts` with `e2e/support/budgets.ts` | per player count |
   | Visual baselines, real input | `e2e/visual.spec.ts`, `e2e/input.spec.ts` via `sandbox.runInteractive` | |

   `expectCleanRun(report)` (`e2e/support/sandbox.ts`) is the default assertion. A check the
   report cannot express becomes an `AnomalyCode` in the sandbox (see "Extending" in
   `sandbox-framework.md`), not ad hoc logic in a spec.
4. **Prove it** on one project with a narrow grep, locally or by dispatch
   ([running.md](references/running.md)). Never the `e2e` PR label for one scenario.
5. **Keep the inventory in sync**: the Scenarios list in `docs/testing/sandbox-framework.md`, and the lists
   in `scripts/animation-audit.mjs` (`LONG_SCENARIOS`, `DRIVER_SCENARIOS`, `FAULT_SCENARIOS`,
   `INPUT_SCENARIOS`) that decide which batch presets run it.

## Rules

- Deterministic only: virtual clock (the fixture's default `fast`), seeded table (`seed`, default
  7), `random` card picks derived from the frame number. `clock: 'real'` belongs to
  `e2e/performance.spec.ts` alone.
- A scenario must finish without a driver: unheld snapshots run through and `external` steps are
  skipped, so follow an `external` with a fallback, as `real-touch-play` enables `autoplay`.
- End idle (`...finishTrick` or `wait-for idle`). The run then settles and flags anything still
  moving or stuck.
- Every `measure-start` has a `measure-end` with the same label (the registry test checks it).
- Thresholds and shared defaults live in `sandbox.config.ts` (`SANDBOX_AUDIT`, `SANDBOX_FAULTS`)
  or `sandbox-budgets.config.ts`. Step timings are part of the script and stay in it.
- Drive the game only through what production calls: `SandboxGameHandles`, the `SandboxServer`
  port, `FaultableSocket`, `BrowserFaults`. Never a test-only hook in game code.

## Pitfalls in one line each

- All page time is virtual: `wait`, `timeoutMs` and latency are virtual ms; `wait-for` defaults to
  15 s; `all-landed` and `trick-collected` wait for the next event after the step starts.
- Agent API points are CSS px client coordinates. Never scale by `devicePixelRatio`; dispatch
  synthetic pointers through `synthetic-pointer.ts`, which pins `offsetX/Y` on scaled displays.
- Simulate GPU loss only with the `lose-context` step: it needs `WEBGL_lose_context`, and the
  stall and restore checks know only that path.

## Hand-off

Report the scenario id and what it covers, the spec and test title that assert it, the run that
proved it (local project, or the dispatch and its grep), and for a regression, the anomaly code it
raised before the fix.
