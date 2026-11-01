# Rule map

Each rule question, its single owner, and who reads it. Paths are relative to the repo root;
`expansions/` means `shared/domain/expansions/`.

## Owners

| Question | Owner | File |
| --- | --- | --- |
| How does this card behave (rank, suit, value, effects, trump reveal, sort order)? | `CARD_DEFINITIONS`, `getCardDefinition` | `expansions/card-definitions.ts` |
| Card plus declaration, Vampire copying | `resolveCardBehavior`, `getEffectiveDefinition`, `ICardRoundContext` | `expansions/card-rules.ts` |
| Which choice must a player announce, is it valid? | `getRequiredDeclaration`, `normalizeDeclaration`, `getDeclarationOptions` | `expansions/card-rules.ts` |
| What is the lead of a trick (pending, free, suit)? | `leadOf`, `advanceLead`, `TrickLead` | `expansions/trick-lead.ts` |
| Lead of played cards | `getTrickLead` | `expansions/card-rules.ts` |
| Which cards may a player play? | `legalPlays(hand, lead)` | `expansions/card-rules.ts` |
| Who takes the trick, who leads next, is it voided? | `resolveTrick` (`wouldTakeLead`, `behaviorBeats` for heuristics) | `expansions/trick-resolver.ts` |
| What happens after a trick (Juggler, Cloud, Witch)? | `deriveTrickEffects`, `HANDLERS`, `getForcedResponse`, `parseEffectResponse` | `expansions/trick-effects.ts` |
| What is trump, who chooses it (Werewolf)? | `revealTrump` | `expansions/trump-reveal.ts` |
| What is in the deck? | `buildDeckCards`, `countInDeck`, `CLASSIC_DECK_SIZE` | `expansions/deck-composition.ts` |
| Official special-card sets | `EXPANSION_SETS`, `findMatchingExpansionSet` | `expansions/expansion-sets.ts` |
| Which special cards a room plays, Dragon and Fairy paired | `normalizeSpecialCards`, `SPECIAL_CARD_PAIRS` | `shared/domain/value-objects/expansion-rules.ts` |
| How many rounds, how many cards each? | `getRoundCount`, `getCardsForRound`, `getRoundPlan` | `expansions/round-rules.ts` |
| Is a bid in range, which bid is forbidden (hook rule)? | `isBidInRange`, `computeForbiddenBid` | `expansions/round-rules.ts` |
| What does a round score? | `scoreRound` | `expansions/round-rules.ts` |
| Who may see which bid? | `createBidVisibilityPolicy` (`shouldShowBids` in `services/rule-appliers.ts`) | `shared/domain/services/bid-visibility.ts` |
| Ranks and winners, ties | `getStandings`, `getWinnerIds` | `shared/domain/services/standings.service.ts` |
| Which phase may follow which? | `PHASE_TRANSITIONS` | `shared/domain/value-objects/game-phase.ts` |
| Which options exist, defaults, limits, normalizing | `IRulesetConfig`, `DEFAULT_*_RULES`, `RULESET_LIMITS`, `ensureRulesetConfig` | `shared/domain/value-objects/ruleset-config.ts` |
| Strict validation (tournaments, match tickets), house-rule count | `validateRulesetConfig`, `parseRulesetConfigSafe`, `countNonDefaultRules` | `shared/domain/value-objects/ruleset-validation.ts` |
| Settings UI text and ranges | `RULE_METADATA`, `RULE_CATEGORIES` | `shared/domain/value-objects/ruleset-metadata.ts` |
| Player-facing card names and rule text | `CARD_CATALOG` | `expansions/card-catalog.ts` |

`BiddingService` and `Player.calculateRoundScore` are thin delegates for existing callers. Never
put rule logic in them.

## Where the game enforces them

- `GameRound` (`shared/domain/entities/game-round.ts`): deal, trump, `placeBid`,
  `getForbiddenBidFor`, `getBidVisibility`, `completeRound` (scores through
  `Player.applyRoundScore`), standings.
- `Game` (`shared/domain/entities/game.ts`): `playCard`, `getLegalPlays`,
  `getDeclarationError`, trick completion, `resolveEffect`. `Trick` (`entities/trick.ts`) derives
  its lead and resolves itself with `resolveTrick`.
- Use cases (`shared/application/use-cases/game/`) orchestrate and map events; they hold no rules.

## Who reads them

| Reader | Reads | File |
| --- | --- | --- |
| Per-seat state | bid visibility, hidden hands, Juggler choices | `shared/application/projections/personalized-state.ts` |
| Client legal cards | `getLegalPlays` projection, once per snapshot | `shared/application/projections/legal-plays.ts`, `src/presentation/hooks/connection/game-client-state.ts` |
| Server broadcasts | `shouldShowBids` before `BID_PLACED` | `party/handlers/game-handlers.ts`, `party/bot/bot-turn.ts` |
| Bots: rule questions | lead, legal cards, trick winner, void inference | `shared/domain/bot-ai/bot-rules.ts` |
| Bots: special cards | classic mapping; declarations, trump, effect answers | `shared/domain/bot-ai/classic-view.ts`, `shared/domain/bot-ai/strategies/special-card-strategy.ts` |
| Bots and timeouts: safety net | legal check and deterministic fallback | `shared/application/use-cases/bot/bot-fallback.ts`, `shared/application/use-cases/game/turn-timeout.use-case.ts` |
| Lobby | house-rule chips (listed by hand) and count | `src/presentation/components/lobby/table/lobby-view.ts` (`summarizeRules`) |
| Settings | options from `RULE_METADATA`; special-card selection | `src/presentation/components/settings/RulesetSection.tsx`, `src/presentation/components/settings/expansions/` |
| In-game special cards | declaration picker, effect prompts, notices | `src/presentation/components/special-cards/` |
| Card faces and guide | emblems, palettes, icons, mini cards, explainer | `src/presentation/utils/card-textures/special-cards/`, `src/presentation/components/expansion-guide/`, `src/presentation/components/bidding/mini-card-styles.ts` |
| Game end, stats | `getWinnerIds`, `getStandings` | `src/presentation/components/GameEndUI.tsx`, `src/presentation/components/game-end/game-end-podium.ts`, `src/presentation/hooks/useGameEffects.ts`, `party/telemetry/telemetry-mapper.ts` |
| Tournaments | strict ruleset validation; stored settings re-normalized | `shared/domain/tournament/tournament-validation.ts`, `shared/tournament/match-ticket.ts`, `src/infrastructure/tournament/tournament-rows.ts` |
| Achievements | final and running scores | `shared/domain/account/achievements.ts`, `shared/domain/account/achievement-facts.ts` |

Adding a member to `CardType`, `TrickRank` or an effect kind makes the compiler flag every
exhaustive table (`Record<CardType, …>`, `Record<SpecialCardType, …>`, `HANDLERS`). `switch`
statements over `TrickEffectKind` in the client and the bots are not exhaustive: grep them.
