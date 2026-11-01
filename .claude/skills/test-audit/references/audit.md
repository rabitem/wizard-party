# Auditing existing tests

Use after the [authoring gate](../SKILL.md#authoring-gate). For a whole area also follow
[CAMPAIGN.md](../CAMPAIGN.md).

## Candidate evidence

Discovery is read-only. Before you mark a test for deletion, read:

- the whole test, including tables and helpers;
- the production owner, its entry point, callers and callees (`git grep`);
- sibling tests and any stronger proof of the same contract (room harness, loopback, sandbox);
- the file's history (`git log --follow -p -- <file>`): why it was added, which bug it guards.

Record for each candidate:

- name and location, and what failure it can detect;
- production callers of the code it covers, outside tests;
- the stronger proof that remains, or why there is no contract;
- what the deletion unlocks (a test-only export, a seam, a mock);
- the risk and the focused proof to run afterwards.

Missing evidence means no deletion. Prefer a few high-confidence candidates to many guesses.

## Marks

Each test declaration gets one mark. An `it.each` is one declaration unless its rows differ.

- `R` retain: name the contract and the bug it catches. Moving it to a better file stays `R`.
- `F` fix: the contract is real but the assertion is weak (vacuous negative, call-shape check,
  self-generated expectation). Rewrite it to assert the observable result.
- `C` consolidate: name the owner that absorbs it (a table row, a stronger boundary suite).
- `D` delete: name the proof that remains, or why no contract exists.

Judge by the assertions, not the name.

## Cutover

- Delete test-only production seams together with the tests that needed them.
- Move retained regressions to their owner; don't keep a duplicate "just in case".
- Never add implementation tests to replace deleted ones.
- After removing tests, look for support files and exports nothing uses any more
  (`git grep -n "<symbol>"`) and remove them too.
- Prefer a net reduction in production lines. A refactor that only adds indirection for tests is
  a seam.

## Preservation review

Before claiming the audit is done, someone who did not do the cutover compares deleted coverage
against the keepers. For each contract that lost its only proof, restore it at the owner. For each
restored contract, break the production code on purpose once and confirm the keeper fails, then
restore the code exactly.

## Report

- Test and production line counts before and after.
- Contracts kept and their keepers, files retired, seams removed.
- Gaps found in review and how they were closed.
- Product bugs found, fixed in separate commits with a failing-then-passing regression.
- What was not run and must be proven on CI.
