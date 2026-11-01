---
name: rules-change
description: "Use when changing or adding a Wizard Party game rule, house-rule option, expansion or special card, trick effect, bidding rule (hook rule, hidden bids), scoring, round plan, trick winner or legal-play logic, or when bots, projections or the client disagree with the rules. Triggers: rule, ruleset, house rule, variant, scoring, forbidden bid, hidden bids, follow suit, trick winner, trump, special card, expansion, anniversary edition, Juggler, Cloud, Bomb, Witch, Werewolf, Vampire, Shapeshifter, Dragon, Fairy."
---

# Rules change

Every rule question has exactly one implementation in `shared/domain/expansions/`. The server
(`Game`), the client projections, the bots and the tests all call it. A rules change is done when
that one place changed, everything that reads it still agrees, and the proof lives at the owner.

- Where each rule lives and who reads it: [rule-map.md](references/rule-map.md).
- Step lists for a ruleset option, a scoring or bidding change, a new special card or a new trick
  effect, plus deploy and storage compatibility: [checklists.md](references/checklists.md).
- Background on the aggregate, the lead model and the bots: `docs/game-rules/engine.md`.

## Before you start

1. Name the rule in rule-book terms ("the last bidder may not make the bids add up"), and where it
   comes from: the AMIGO rules, an anniversary edition FAQ, or a house rule. A house rule is an
   opt-in option whose default keeps today's game.
2. Find its single owner in [rule-map.md](references/rule-map.md). If you are about to write the
   rule a second time (in a hook, a component, a bot, a handler), stop and call the owner instead.
3. Decide whether it changes running games. Rooms survive worker deploys (`Game.fromJSON` restores
   them with the new code), so changing what an existing option or the default means changes the
   rest of every game in progress. Prefer a new option with the old behaviour as its default.

## Invariants (never break, always prove)

- **One policy.** Lead: `leadOf` / `getTrickLead` (`trick-lead.ts`, `card-rules.ts`). Legal plays:
  `legalPlays(hand, lead)`. Trick winner: `resolveTrick` (`trick-resolver.ts`). Round plan, bid
  range, hook rule, scoring: `round-rules.ts`. Card behaviour: the `CARD_DEFINITIONS` registry, never
  a `switch` on `CardType` in a rule engine.
- **Legality is derived, never stored.** The lead comes from the trick's cards on every read;
  `ITrick.leadSuit` is a wire convenience (pending and free both read `null`). Never decide
  legality from `leadSuit`.
- **The aggregate is safe on its own.** `Game` rejects every illegal move with a typed `GameError`
  (`shared/domain/errors/game-errors.ts`) even when a caller skipped its checks. Use cases only
  orchestrate; command decoders only check shape.
- **Hidden information stays hidden.** `game.toJSON()` is the server's full truth. Every
  per-seat view goes through `createPersonalizedState` (other hands as `hidden` backs, hidden
  bids, the forbidden bid only for the player it restricts, other players' Juggler choices).
  `BID_PLACED` is broadcast only when `shouldShowBids` allows it (`party/handlers/game-handlers.ts`,
  `party/bot/bot-turn.ts`). A new private field must be redacted in the projection and kept out
  of `BroadcastEvent` (`shared/domain/events/game-events.ts`).
- **Bids.** Whole numbers from 0 to the cards dealt, once per player per round, by the current
  player; the hook rule applies only to the last player without a bid (`computeForbiddenBid`).
- **Scoring and ties.** `scoreRound` is the only round score. Standings use competition ranking
  (`standings.service.ts`): tied scores share a rank and every co-winner wins (`getWinnerIds`).
- **Determinism.** Rules are pure functions of the ruleset and the cards. Randomness comes only from
  the game's `IRandom`, time only from its `IClock` (`shared/domain/ports`).
- **Rules are fixed once a game starts.** `SET_RULESET` is host-only and lobby-only
  (`party/handlers/settings-handlers.ts`); tournament matches lock it (`party/tournament/match-command-gate.ts`).

## Bots

- Bots ask rule questions through `shared/domain/bot-ai/bot-rules.ts`, which delegates to the
  rules policy. Simulations (Monte Carlo, ISMCTS, alpha-beta, EPIMC, card inference) must use it,
  so a new card rule needs no bot change unless the bot must reason about it differently.
- The algorithms see the classic deck: `classic-view.ts` maps each special card to the classic
  card it behaves like. A new special card needs a mapping there. Declarations, trump choice and
  effect answers are decided by `strategies/special-card-strategy.ts` against the real game.
- A bot never knows more than a human in its seat. `BotBrain.buildGameContext` applies
  `game.getBidVisibility(playerId)` and passes only the bot's own hand and its own forbidden bid.
  Code that receives the real `Game` (`SpecialCardStrategy`) reads only what the seat's projection
  would show: its own hand, public cards, visible bids.
- Every decision is checked with `isLegalBotAction` and replaced by `fallbackBotAction` when
  illegal (`shared/application/use-cases/bot/bot-fallback.ts`). The turn-timeout move uses the same
  fallback. A new phase, declaration or effect needs a deterministic legal fallback there, or the
  table stalls.
- Bot numbers (budgets, thresholds) live in `shared/domain/constants/bot-ai.constants.ts`.

## Tests that own the rules

| Contract | Owner |
| --- | --- |
| Lead and legal plays, Wizard / Jester leads | `shared/domain/expansions/trick-lead.test.ts` |
| Special cards: deck, trick resolution, follow suit, trump reveal, effect order | `shared/domain/expansions/expansions.test.ts` |
| Bid validation, hook rule, phase machine, serialization, standings and ties | `shared/domain/entities/game-aggregate.test.ts` |
| Ruleset options applied by the game (round count, descending rounds, equal bids, custom scoring, timers) | `shared/domain/entities/game-ruleset.test.ts` |
| Normalizing and validating rulesets | `shared/domain/value-objects/ruleset-config.test.ts` |
| Hidden bids, forbidden bid, hands, legal-plays projection | `shared/application/projections/projections.test.ts` |
| Bots use the room's rules; hidden bids hidden from bots; fallbacks | `shared/domain/bot-ai/bot-rules.test.ts`, `shared/domain/bot-ai/strategies/bidding-strategy.test.ts`, `shared/application/use-cases/bot/bot-turn.use-case.test.ts` |

Rule cases are table rows (`it.each`) in the owner file; extend the table before adding a file.
Expected values come from the rule book, never from running the engine.

Full-round proof:

- `shared/application/use-cases/game/random-games.property.test.ts` plays seeded random games
  through the use cases and checks every command against a reference oracle written from the rule
  book (lead, legal plays, hook rule, trick winner, scoring, round plan, ties, persistence round
  trip). The oracle shares no code with the engine and covers the classic deck. A classic rule
  change must change the oracle and `randomRuleset` in the same commit. Set `PROPERTY_GAMES` for a
  deeper local run.
- `shared/application/use-cases/game/special-cards.integration.test.ts` plays staged tricks for
  each special card and full bot games with every special card in the deck.
- `party/room/game-room.test.ts` plays rounds through the real `GameRoom` on `RoomHarness`
  (`round end`, `invariants`); `expectRoomInvariants` asserts no snapshot shows another player's
  cards. Touch it only when the change reaches the room: a new command, event, phase or deadline.

Follow `.claude/skills/test-audit` for every test you add or change.

## Protocol impact

- A ruleset option travels inside `IRulesetConfig` (`SET_RULESET`, room settings, `GAME_STATE`)
  and needs no new command. A new declaration rides on `PLAY_CARD.declaration`, a new effect answer
  on `RESOLVE_EFFECT.response` (`parseEffectResponse`). New commands and events follow
  `docs/server/protocol.md` (Adding things).
- The web app and the game worker deploy separately and browsers keep stale bundles, so each side
  must read what the other side's previous release sends: new fields optional, missing means the
  old behaviour. Details per change type: [checklists.md](references/checklists.md#compatibility).
- Bump `PROTOCOL_VERSION` only for a change an old client cannot read safely, never for a rule.

## Docs to update in the same change

- `docs/game-rules/engine.md`: the rules table, invariants, bots and tests sections.
- `shared/domain/expansions/card-catalog.ts`: the player-facing rule text (lobby, help, card faces,
  notices read it).
- `RULE_METADATA` (`shared/domain/value-objects/ruleset-metadata.ts`): the option's name and
  description in the settings UI.
- `README.md` features line when the game's rule set visibly changes.
- `docs/server/protocol.md` for a new command, event or persisted field;
  `docs/accounts/accounts.md` when a scoring change moves score-based achievements.

## Proof and hand-off

- Before you finish, grep for copies of the rule you changed and route them through the owner,
  for example `git grep -nE "tricksWon \*|penaltyPerMiss" -- src party` for scoring.
- Run the owners and the full-round tests: `npx vitest run shared/domain shared/application` (plus
  `party/room` when the room changed). Where your machine cannot run them, push and read the CI run
  (`.github/workflows/ci.yml`). Say which you did.
- Report: the rule in rule-book terms, the owner you changed, compatibility with running games and
  the previous client and worker, the tests that prove it, and anything left unproven.
