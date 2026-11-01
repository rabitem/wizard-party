# Test campaign: one area's whole test surface

A campaign rebuilds one area's tests in one pull request. The gate, junk patterns, retention bar
and evidence rules in [SKILL.md](SKILL.md) and [audit.md](references/audit.md) apply to every
step. Finish each step before starting the next.

## 1. Baseline

Record line counts for the area's tests, support files and production code, and the pass or fail
state of every test file at a pinned `main` commit (from CI if you cannot run it locally). Keep
failures in their own list: they may be product bugs.

## 2. Lanes

Split the area along production owners, not file names. Typical lanes here:

- rules and bots (`shared/domain`), use cases (`shared/application`);
- server room and protocol (`party/`);
- client connection and trick presentation (`src/presentation/hooks/connection`);
- rendering and animation (`components/three`, `table`, `game-table`, `utils/card-textures`);
- HUD, settings and lobby UI;
- accounts, social and tournaments (domain, API routes, infrastructure);
- platform libraries (sound, telemetry, storage);
- sandbox and browser suites (`components/sandbox`, `infrastructure/sandbox`, `e2e/`).

Every test file belongs to exactly one lane.

## 3. Ledger

One reader per lane reads every test in full together with its production owner, and marks each
declaration `R`, `F`, `C` or `D` with one line of evidence.

## 4. Layer plan

A second pass over the ledger looks for whole layers that replay a stronger one, for example hook
tests with a mocked socket where the loopback full-stack test already covers the flow. For each
contract, name the keeper suite. Prefer the real boundary with a fake transport over a mocked
collaborator. The plan lists retired files, keepers, assertions to carry over and seams unlocked.

## 5. Cutover

Edit lane by lane. One owner edits shared harnesses (`party/test-support`,
`src/infrastructure/sandbox`, `e2e/support`). Remove the seams each lane unlocks. Write durable
test rules you learned into `AGENTS.md` only if they are about this codebase and not already there.

## 6. Preservation review and mutations

Independent reviewers compare deleted coverage with the keepers, one per boundary. Restore every
real gap; prove each restored keeper with one deliberate mutation of production code.

## 7. Product bugs

A baseline failure that survives into a keeper is a bug. Fix it at its owner in a separate commit
with a regression that fails without the fix.

## 8. Hand-off

Merge `main` into a long campaign instead of rebasing it. If `main` changed a test the campaign
deleted, port the new contract into the keeper. Report with the line counts, lanes, keepers,
review gaps, mutations and bugs.
