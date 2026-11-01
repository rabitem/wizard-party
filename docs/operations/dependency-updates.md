# Dependency updates

Dependabot opens the update pull requests, and one workflow merges the safe ones once every check
is green. Read this page when an update pull request sits unmerged, when you change the policy or
when you run the repository as a fork. The checks it waits for are in
[testing.md](../testing/testing.md) and `.github/workflows/ci.yml`; how to read a failing run is in
`.claude/skills/pull-request/references/ci.md` ("Dependabot auto-merge").

## How it works

```
.github/dependabot.yml                         what Dependabot opens, and when
.github/workflows/dependabot-auto-merge.yml    the trigger, the permissions, the trusted checkout
.github/scripts/dependabot-auto-merge.mjs      the policy: what may merge, and when
.github/scripts/dependabot-auto-merge.test.mjs its tests, run by npm test
```

| Ecosystem | Schedule | Grouping | Merged by |
| --- | --- | --- | --- |
| `npm` (`package.json`, `package-lock.json`) | Weekly | One group, `minor-and-patch`, holds every minor and patch update. A major update is its own pull request | The auto-merge workflow for minor and patch, a person for major |
| `github-actions` (workflow files) | Monthly | One group, `actions` | A person. The policy accepts only npm manifest changes |

Workflows pin each action by commit SHA, and the `github-actions` pull requests keep the pins
current.

## The auto-merge policy

The workflow runs on `pull_request_target` for pull requests against `main` (opened, reopened,
synchronised, ready for review). The job starts only when all of these hold:

- the author is `dependabot[bot]`;
- the head branch is in this repository and starts with `dependabot/npm_and_yarn/`;
- the pull request is not a draft.

Then:

1. `dependabot/fetch-metadata` reads the update type from Dependabot's metadata.
2. A minor or patch update continues. For anything else the remaining steps are skipped, the pull
   request stays open and a person reviews it.
3. The job checks out the **base** commit of the pull request, sparsely (`.github/scripts` only),
   without persisting credentials. It never checks out, installs or runs the pull request's code.
   The privileged job runs the policy script from the base branch, and the dependency code is
   built and tested by CI, which has read-only permissions.
4. `dependabot-auto-merge.mjs` decides. It leaves the pull request open, and fails the job, when:
   - it changes a file other than `package.json` or `package-lock.json`, or adds or removes one;
   - a completed check run has a conclusion other than `success`, `neutral` or `skipped`, or a
     commit status is `failure` or `error`;
   - a reviewer's latest decision is "changes requested";
   - the checks are not all green within the polling window.

   It returns without merging when the pull request is no longer the same one it started with.
5. The merge is a squash merge pinned to the head SHA the checks ran against. GitHub refuses it
   when the head has moved.

### What "all green" means

`getCheckState` in the script returns `ready` only when every one of these holds for the head
commit:

- the check `Verify application` from `github-actions` (the job in `ci.yml`) completed with
  `success`;
- the check `GitGuardian Security Checks` from the `gitguardian` app completed with `success`;
- the commit status `Vercel` is `success`;
- every other check run is completed, and every latest commit status is `success`.

A `skipped` or `neutral` conclusion is accepted for other checks and never for a required one. The
job ignores its own check run. A same-named check from another app does not count.

The merge also waits for GitHub to report the pull request as mergeable with state `clean`. The
script polls every `POLL_INTERVAL_MS` up to `MAX_ATTEMPTS` times (about 15 minutes), and the job
has a 20 minute timeout. Past the deadline the pull request stays open and the job fails.

The browser suites (`e2e.yml`) are not required: they run on the `e2e` label, weekly and on
demand. A run on the head commit counts like any other check.

## Contracts

- **The privileged job never runs pull-request code.** Do not add a step that checks out the head
  ref, installs dependencies or runs a script from the pull request.
- **The policy lives on the base branch.** Changing the script takes effect for pull requests
  opened or updated after the change merges.
- **Permissions are minimal.** The workflow grants none by default. The job gets `contents: write`
  and `pull-requests: write` to merge, and `checks: read` and `statuses: read` to wait.
- **Failures leave the pull request open.** Nothing in the policy merges on a missing, queued or
  unknown check.

## Operating

- A pull request that stopped: read the job log, then follow
  `.claude/skills/pull-request/references/ci.md`. Commenting `@dependabot rebase` or closing and
  reopening the pull request starts a new run.
- A major update: review the changelog, run the same checks locally or on a branch and merge by
  hand.
- A fork: the gate names `Verify application`, `GitGuardian Security Checks` and the `Vercel`
  status. A fork without GitGuardian or Vercel never reaches `ready`. Edit `REQUIRED_CHECKS` and
  the `Vercel` test in `getCheckState`, and the matching cases in the test file, to name the checks
  the fork runs.

## Adding things

- **Another ecosystem.** An entry in `.github/dependabot.yml`. It does not auto-merge: the
  workflow's branch prefix and the file allow-list in the script cover npm only.
- **Another required check.** Add it to `REQUIRED_CHECKS` in the script and to the "ready" case in
  `dependabot-auto-merge.test.mjs`.
- **A different update scope** (for example majors). Change `ELIGIBLE_UPDATES` in the script and
  the `if` conditions on the two steps in the workflow together, and write the test first.
  Majors stay manual by policy.

## Tests

`.github/scripts/dependabot-auto-merge.test.mjs` runs under `npm test` (vitest). It covers the
check gate (required checks, other apps, the newest status), pull request identity and reviews,
the file allow-list, the polling deadline and the head and base moving after the checks passed.
