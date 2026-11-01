# Reading CI failures

```bash
gh pr checks <n>                      # every check on the PR and its state
gh run view <run-id> --log-failed     # only the failed steps' logs
gh run rerun <run-id> --failed        # once, after you have a reason to suspect flakiness
```

A `cancelled` run is usually just superseded: both workflows cancel the run in progress when a
newer push to the same PR arrives. It is not a failure.

## `Verify application` (ci.yml)

The steps run in order and stop at the first failure. Fix that step first. Later steps never ran.

| Step | Runs | Typical cause |
| --- | --- | --- |
| `npm ci` | install from the lockfile | `package.json` and `package-lock.json` disagree. Commit both together. |
| `npm run typecheck` | `tsc --noEmit`, then `tsc --project tsconfig.worker.json` | The second pass checks only `party/worker.ts` and what it imports, with `@cloudflare/workers-types` and no DOM types. A `window`, `document` or browser-only import reached from `party/` or `shared/` fails there, not in the first pass. |
| `npm run lint` | `eslint` (`eslint.config.mjs`) | Errors fail and warnings don't. Common errors: `max-lines` (more than 300 lines is an error; in `shared/`, `party/`, `src/presentation/config/` and a few listed UI folders, more than 400 is only a warning; test files have no limit), `localStorage` or `sessionStorage` used outside `src/lib/storage`, unused variables, `no-duplicate-imports`. Split the file. Don't raise the limit. |
| `npm test` | `vitest run`, `node` environment, every `*.test.*` outside `e2e/` | Read the first failing assertion and the test name. A failure in a test you didn't touch may be a real regression or a product bug: follow the `test-audit` skill, and never delete the test to get green. |
| `npm run build` | `next build` | A server component imports a client-only module, `'use client'` is missing, or a route reads a browser global at module scope. |
| `npm run check:worker` | `wrangler deploy --dry-run` | The worker bundle in `wrangler.jsonc` (`main: party/worker.ts`) fails to build, for example because of a Node built-in or a package that doesn't bundle for Workers. |
| Multiplayer smoke test | `npm run dev:party` on port 1999, then `node scripts/realtime-smoke.mjs` | It opens raw sockets to the worker and checks its shape on a dealt round (`docs/testing/testing.md`, "The verify job"). A `Timed out: <label>` message names the step that never happened. Server errors fail the run straight away. On failure the step prints the worker log after the assertion. Read that log from the bottom up. |

To reproduce a step, run the same npm script on a machine that can (`npx vitest run <paths>` for
a single test file). If yours can't, push the fix and read the next run. Your PR description must
say which you did.

## Browser suites (e2e.yml)

- A pull request with the `e2e` label runs the `chromium` and `android-phone` projects.
  `workflow_dispatch` runs every project in two shards. With `grep`, it runs only the tests whose
  titles match. Frame-time budgets (`sustains` tests) never run on CI.
- A failed or timed-out job uploads `e2e-<project>-<shard>`, holding `e2e-report/` (HTML report)
  and `e2e-results/` (traces). To look at them:

  ```bash
  gh run download <run-id> -n e2e-chromium-1
  npx playwright show-report e2e-report
  npx playwright show-trace e2e-results/<test>/trace.zip
  ```

- Visual diffs: baselines depend on the GPU and the fonts, so they are generated only on CI. Run
  `gh workflow run e2e.yml --ref <branch> -f update_snapshots=true`, download each
  `visual-baselines-<project>` artifact into `e2e/visual.spec.ts-snapshots/` and commit. A
  missing baseline is annotated `missing-baseline` and skipped. Mask new animated DOM regions with
  `data-visual-mask`.
- Sandbox, budgets and devices: `docs/testing/testing.md` and `docs/testing/sandbox-framework.md`.

## Dependabot auto-merge (dependabot-auto-merge.yml)

The job log says why it stopped:

- `Major or unclassified update` is a normal skip. A human reviews the PR.
- `Only npm manifest and lockfile modifications can auto-merge`: the PR touches other files.
- `A check failed or was cancelled`: fix or rerun that check. Then comment `@dependabot rebase`
  or close and reopen the PR, which starts a new auto-merge run.
- `Checks did not all pass before the deadline`: CI, GitGuardian or Vercel took longer than 15
  minutes. Merge by hand once all of them are green.
