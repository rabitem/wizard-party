# Change checklists

Work top to bottom. Each list ends with the proof that change type needs. Paths are relative to the
repo root; `expansions/` means `shared/domain/expansions/`, `value-objects/` means
`shared/domain/value-objects/`.

## A ruleset option (house rule)

1. `value-objects/ruleset-config.ts`: the field on its category interface (with a doc comment),
   its default in `DEFAULT_*_RULES`, its range in `RULESET_LIMITS` if numeric (whole numbers
   only), and its branch in `ensureRulesetConfig`. The default keeps today's game.
2. `value-objects/ruleset-validation.ts`: the category's `validate*Rules` (absent means the
   default, see [Compatibility](#compatibility)), `parse*RulesSafe` and `countNonDefaultRules`.
   All three list fields by hand.
3. `value-objects/ruleset-metadata.ts`: a `RULE_METADATA` entry. `RulesetSection.tsx` renders the
   settings from it, with ranges from the same limit table.
4. Implement it in its owner (see [rule-map.md](rule-map.md)), reading the category the game
   already passes (`this.rulesetConfig.card`, `.bidding`, `.scoring`, `.structure`).
5. `src/presentation/components/lobby/table/lobby-view.ts`: a chip in `summarizeRules` if players
   should notice it at the table.
6. Bots: a card rule reaches them through `GameContext.cardRules` when the owner takes
   `ICardRules`. A bidding rule must reach `GameContext` (`BotBrain.buildGameContext`) and
   `fallbackBid` in `bot-fallback.ts`.
7. Proof: a row in `value-objects/ruleset-config.test.ts` (invalid and missing values normalize to
   the default), rows in the owner's table test, a case in
   `shared/domain/entities/game-ruleset.test.ts` when the aggregate applies it, and the oracle plus
   `randomRuleset` in `random-games.property.test.ts`.

## A scoring, bidding or round-plan change

1. Change `scoreRound`, `isBidInRange`, `computeForbiddenBid` or the round plan in
   `expansions/round-rules.ts`. The aggregate (`GameRound.placeBid`, `getForbiddenBidFor`,
   `completeRound`) and the delegates follow.
2. Update the oracle in `random-games.property.test.ts` (`oracleScore`, `oracleForbiddenBid`, the
   round-plan check) from the rule book, and randomize the new setting in `randomRuleset` (scoring
   is fixed at 20/10/10 there today).
3. Find copies of the rule outside the domain and route them through it
   (`scoreRound(bid, tricksWon, state.rulesetConfig.scoring)`):
   `git grep -nE "tricksWon \*|penaltyPerMiss|baseBidPoints" -- src party`.
4. Bots: bid evaluation assumes classic scoring (`RISK_ADJUSTMENT` in
   `shared/domain/constants/bot-ai.constants.ts`, used by `bot-ai/probability-math.ts` and
   `bot-ai/algorithms/cfr-bidding.evaluation.ts`). That stays legal under any scoring; pass the
   room's scoring through `GameContext` only if bots should play to it. The forbidden bid reaches
   strategies as `context.forbiddenBid`; never let a strategy compute it from other bids.
5. Hidden bids: anything derived from other players' bids (sums, the forbidden bid, "bids add up"
   hints) is hidden by the same `createBidVisibilityPolicy`. Assert the projection in
   `projections.test.ts` and the bot context in `bot-turn.use-case.test.ts`.
6. Score-based achievements (`shared/domain/account/achievements.ts`, `docs/accounts/accounts.md`) and
   tournament results read final scores. Check whether thresholds still mean what they say.

## A new special card

1. `value-objects/card-types.ts`: the `CardType` member and its place in `SPECIAL_CARD_TYPES`
   (canonical order).
2. `expansions/card-definitions.ts`: copies, declaration, `alwaysPlayable`, `trumpReveal`,
   `swapsWithTrumpCard`, `copiesTrumpCard`, `sortOrder` and `behave`. Values such as
   `JUGGLER_VALUE` are constants there.
3. A new strength class: `TrickRank` (`card-behavior.ts`), `RANK_STRENGTH`, `LOW_RANK_ORDER` and
   `findDecidingIndex` (`trick-resolver.ts`), and its lead semantics in `advanceLead`
   (`trick-lead.ts`).
4. `expansions/card-catalog.ts` (player-facing text), `expansions/expansion-sets.ts` if it ships
   with a set, `SPECIAL_CARD_PAIRS` (`value-objects/expansion-rules.ts`) if the official rules pair
   it.
5. Bots: its classic equivalent in `bot-ai/classic-view.ts`; declarations, trump and effects in
   `bot-ai/strategies/special-card-strategy.ts`. `fallbackCard` handles any `DeclarationKind`.
6. Client: the compiler flags `special-card-emblems.ts`, `special-card-palettes.ts`
   (`src/presentation/utils/card-textures/special-cards/`), `special-card-icons.ts`
   (`components/expansion-guide/`) and `mini-card-styles.ts` (`components/bidding/`). A new
   `DeclarationKind` also needs `DeclarationPicker.tsx` and `getDeclarationOptions`.
7. Proof: rows in `expansions/expansions.test.ts` (deck count, trick resolution against every
   neighbouring rank, follow suit, trump reveal), a staged trick in
   `special-cards.integration.test.ts`. Its full bot games take every `SPECIAL_CARD_TYPES` member,
   so they cover the new card without edits.

## A new trick effect

1. `TrickEffectKind` (`expansions/card-behavior.ts`). An effect that only changes who takes the
   trick (like `VOID_TRICK`) belongs in `resolveTrick` and stops here. An interactive one needs, in
   `expansions/trick-effects.ts`, the pending effect, response and outcome types, a handler in
   `HANDLERS` (`awaiting`, `forcedResponse`, `validate`, `apply`), its place in
   `deriveTrickEffects` (official order) and a branch in `parseEffectResponse`, which decodes the
   wire response.
2. Game access only through `ITrickEffectPort`, implemented in
   `shared/domain/entities/game-effect-port.ts`.
3. Serialization: `copyPendingEffects` (`shared/domain/entities/game-serialization.ts`).
4. Hidden choices: redact them in `hideOtherPlayersChoices`
   (`shared/application/projections/personalized-state.ts`).
5. Bots: `respond` in `special-card-strategy.ts` and `fallbackEffectResponse` in `bot-fallback.ts`.
   Their `switch` statements end in `default`, so the compiler will not remind you.
6. Client: `special-card-view-model.ts`, `SpecialEffectPrompt.tsx` and `special-card-notices.ts`
   (`src/presentation/components/special-cards/`), same `default` caveat.
7. Proof: `expansions.test.ts` (`trick effects`), `special-cards.integration.test.ts`, and
   `projections.test.ts` when choices are hidden.

## Compatibility

The web app and the game worker deploy separately, browsers keep stale bundles, and running rooms
are restored from storage by the new code. There is no client version gate: `PROTOCOL_VERSION`
(`shared/domain/events/protocol.ts`) covers transport and identity, not rules.

- **Missing field, new code.** `ensureRulesetConfig` fills defaults, so stored rooms
  (`Game.fromJSON`), stored tournaments (`src/infrastructure/tournament/tournament-rows.ts`) and
  old clients are fine. `validateRulesetConfig` is strict and guards tournament settings and match
  tickets (`shared/domain/tournament/tournament-validation.ts`, `shared/tournament/match-ticket.ts`):
  treat an absent new field as its default, as `validateExpansionRules` does, or tickets minted
  before the deploy and settings sent by stale tabs are refused.
- **Unknown field, old code.** `ensureRulesetConfig` copies only the keys it knows, so an old
  worker drops a new option and plays the default until the new worker is live.
- **New state fields.** Read them in `restoreGame` (`game-serialization.ts`) with a default for
  rooms saved before the change. Anything private is redacted in `createPersonalizedState`.
- **Changed meaning.** A different meaning for an existing option or default applies to every
  running game once the new worker restores it. Prefer a new opt-in option.
- **New card types and effect kinds.** A stale client's `getCardDefinition` falls back to the
  number-card definition and its effect prompt renders nothing for an unknown kind; an old worker's
  `normalizeSpecialCards` drops unknown types. Keep new cards out of `DEFAULT_EXPANSION_RULES`
  and say in the PR what a stale tab shows.
- **Seeded deals.** Changing deck composition, dealing or how the game draws from `IRandom`
  changes every seeded table: the sandbox (`src/infrastructure/sandbox/loopback-game-server.ts`)
  deals differently, so scripted scenarios and visual baselines see new hands. Regenerate
  baselines on CI only (`docs/testing/testing.md`, Visual baselines).
- **Telemetry** stores the ruleset as JSON (`ruleset` in `db/migrations/0001_telemetry.sql`); a new
  key needs no migration.
