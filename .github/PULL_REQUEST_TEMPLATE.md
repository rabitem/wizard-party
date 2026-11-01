## What changes

<!-- What a player or operator sees, and why. Name the owning modules in backticks. For a game
     rule change, cite the rule. Link the issue it closes, if any: "Closes #123". -->

## Verification

<!-- What ran, where, and the counts: tests added or changed, browsers and devices you played it
     on, screenshots or recordings for UI changes. Use an unchecked box for anything skipped and
     say why. -->

## Follow-ups

<!-- Known gaps, work deliberately left out, anything to deploy or watch after the merge.
     Write "None" if there are none. -->

## Checklist

- [ ] Dependencies flow inward (presentation -> application -> domain); no business logic in components
- [ ] Constants live in config files, types in their layer, files within the size limits in `AGENTS.md`
- [ ] Tests follow the test-audit skill (`.claude/skills/test-audit/SKILL.md`): each one protects observable behaviour, at the right boundary
- [ ] Docs updated (`docs/`, `README.md`, `AGENTS.md`) where behaviour or setup changed
- [ ] No secrets, personal data or local paths in the diff
