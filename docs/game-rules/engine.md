# Rules engine

How the game rules, the `Game` aggregate, the per-seat projections and the bots fit together. Read
this before you change a rule, add a rule option or a special card, or touch the bot AI. The rules
themselves, as players see them, are in [rules.md](rules.md). The room that hosts a `Game` is in
[room.md](../server/room.md), the wire format in [protocol.md](../server/protocol.md). Step lists
for each kind of rules change are in the
[rules-change skill](../../.claude/skills/rules-change/SKILL.md), which also holds the full owner
map in `references/rule-map.md`.

The engine is isomorphic code under `shared/`. It has no I/O: chance and time come in through ports,
so the worker, the browser sandbox, the bots and the tests all run the same rules.

## One rules policy

Every rule question has exactly one implementation, in `shared/domain/expansions/` unless noted. The
server (`Game`), the projections (`shared/application/projections/`) and every bot simulation call
it. Nothing else may implement a rule a second time.

| Question | Function | File |
| --- | --- | --- |
| How does a card behave? | `getCardDefinition`, `resolveCardBehavior` | `card-definitions.ts`, `card-rules.ts` |
| What is the lead of a trick? | `leadOf`, `getTrickLead`, `advanceLead` | `trick-lead.ts`, `card-rules.ts` |
| Which cards may a player play? | `legalPlays(hand, lead)` | `card-rules.ts` |
| Who takes the trick? | `resolveTrick` | `trick-resolver.ts` |
| What happens after a trick? | `deriveTrickEffects` and the `HANDLERS` table | `trick-effects.ts` |
| What is trump, who chooses it? | `revealTrump` | `trump-reveal.ts` |
| What is in the deck? | `buildDeckCards`, `countInDeck` | `deck-composition.ts` |
| How many rounds, how many cards? | `getRoundCount`, `getCardsForRound`, `getRoundPlan` | `round-rules.ts` |
| Is a bid valid, which bid is forbidden? | `isBidInRange`, `computeForbiddenBid` | `round-rules.ts` |
| What does a round score? | `scoreRound` | `round-rules.ts` |
| Who may see which bid? | `createBidVisibilityPolicy` | `shared/domain/services/bid-visibility.ts` |
| Who ranks where? | `getStandings`, `getWinnerIds` | `shared/domain/services/standings.service.ts` |
| Which phase follows which? | `canTransitionPhase` (reads `PHASE_TRANSITIONS`) | `shared/domain/value-objects/game-phase.ts` |

`BiddingService` and `Player.calculateRoundScore` are thin delegates for existing callers and hold
no rule logic.

### Card registry

Rule engines read one registry instead of switching on `CardType`:

```
card-definitions.ts   ICardDefinition per CardType: copies, declaration, always playable, trump
                      reveal, Werewolf swap, Vampire copy, sort order, behave()
card-behavior.ts      TrickRank, TrickEffectKind, CardBehavior: what the engines see of a card
card-rules.ts         card + declaration + round context -> CardBehavior; legalPlays; lead
trick-lead.ts         the explicit lead (below)
trick-resolver.ts     the only trick-winner logic: rank order, Dragon and Fairy, Bomb voiding,
                      lastWizardWins and lastJesterWins
trump-reveal.ts       turned-up card outcome, Werewolf set-aside and holder swap
trick-effects.ts      post-trick effects queue (Juggler pass, Cloud bid change, Witch swap)
deck-composition.ts   the deck from IRulesetConfig.expansions.specialCards
expansion-sets.ts     the edition presets
card-catalog.ts       every player-facing card name and rule text
```

- **Selection.** A room's special cards are `IRulesetConfig.expansions.specialCards`
  (`shared/domain/value-objects/expansion-rules.ts`). `normalizeSpecialCards` drops unknown
  entries, completes the Dragon and Fairy pair and sorts canonically.
- **Round count.** It always comes from the classic 60-card deck (`CLASSIC_DECK_SIZE`), so special
  cards never add rounds, and a card is left to turn up even in the largest round.
- **Pending effects block play.** After a trick the game queues effects. While one is pending,
  `playCard` throws `EffectPendingError`; answers arrive as the `RESOLVE_EFFECT` command, handled by
  `ResolveEffectUseCase`, and are announced with `TRICK_EFFECT_RESOLVED`. `TRICK_COMPLETE.voided`
  marks a Bomb trick. An effect with a single legal answer (a Cloud winner with a bid of 0) resolves
  without input.
- **Effect access.** Handlers touch the game only through `ITrickEffectPort`, implemented in
  `shared/domain/entities/game-effect-port.ts`.
- **Client.** Prompts and view models are in `src/presentation/components/special-cards/`, card
  faces in `src/presentation/utils/card-textures/special-cards/`, mini card styles in
  `src/presentation/components/bidding/mini-card-styles.ts`.
- **Bots.** They see the classic equivalent of each special card (see [Bots](#bots)).

### The lead is explicit

`TrickLead` is `pending | free | suit`:

- **pending**: the trick is empty, or only Jesters and other powerless cards were played. The next
  number card still sets the suit.
- **free**: a Wizard or the Dragon came before any suited card. Nobody has to follow suit for the
  rest of the trick, even after later number cards.
- **suit**: the first suited card set the suit everyone has to follow.

`Trick.getLead()` derives the lead from its cards on every read, and `Trick.fromJSON` re-derives
it, so a stored, stale lead suit is repaired on load. `ITrick.leadSuit` is `Suit | null` on the
wire; pending and free both read as `null`. Never derive legality from `leadSuit`. Call
`getLegalPlays(state, playerId)` (in `shared/application/projections`) or
`legalPlays(hand, getTrickLead(cards))`.

## The Game aggregate

`Game` is built in layers, one file each in `shared/domain/entities/`:

```
GameCore   (game-core.ts)    state, phase state machine, IRandom and IClock ports, turn timer
GameLobby  (game-lobby.ts)   seats, ruleset, grace periods, host, pause and resume
GameRound  (game-round.ts)   start, deal, trump, bidding, scoring, standings
Game       (game.ts)         trick play, special-card effects, rematch, serialisation
```

Callers only see `Game`. Supporting modules are `game.types.ts` (`IGameState` and the result
types), `room-settings.ts`, `turn-timer.ts`, `game-effect-port.ts` and `game-serialization.ts`.

### Phases

```
LOBBY -> DEALING -> TRUMP_SELECTION or BIDDING -> PLAYING -> ROUND_END -> DEALING or GAME_END
```

`GameCore.transitionTo` changes the phase only along the `PHASE_TRANSITIONS` table in
`shared/domain/value-objects/game-phase.ts` (`InvalidPhaseTransitionError` otherwise). A rematch is
a new `Game` in `LOBBY` (`createRematch`). A pause is not a phase: a table waiting for a
disconnected player keeps its phase and carries `pauseState` beside it, and every move is refused
until it resumes (`GamePausedError`). `PAUSED` exists as a `GamePhase` value only for clients on
protocol 1; the aggregate never enters it (see [protocol.md](../server/protocol.md)).

### Invariants live in the aggregate

The aggregate is safe even if a caller skips every check. Each rule raises a typed `GameError`
(`shared/domain/errors/game-errors.ts`), so the server reports a code instead of an unknown error:

- A bid is a whole number from 0 to the cards dealt (`InvalidBidError`), placed once per round
  (`BidAlreadyPlacedError`) by the current player (`NotYourTurnError`). The hook rule applies to
  the last player without a bid (`ForbiddenBidError`), so a skipped or malformed bid cannot move it.
- A trump selection comes from the trump chooser (`NotTrumpChooserError`) and names a suit
  (`InvalidTrumpSuitError`). `null` is allowed only where the choice permits no trump
  (`NoTrumpNotAllowedError`).
- A card played is in the player's legal plays (`CardNotPlayableError`) and carries the
  declaration it needs (`DeclarationRequiredError`).
- The scoring and round-count options are whole numbers within `RULESET_LIMITS`; the timers are
  within `TURN_TIMER_LIMITS`. The normaliser, the validator and the UI metadata all read these
  tables.
- A bot's difficulty is parsed into 1 to 5 (`parseBotDifficulty`). A human never has one.
- A ruleset can be set only in the lobby (`GameAlreadyStartedError`); the host-only check is in
  `party/handlers/settings-handlers.ts`.

The use cases in `shared/application/use-cases/game/` (`PlaceBid`, `PlayCard`, `SelectTrump`,
`ResolveEffect`) orchestrate and map events. Decoding raw command payloads is a separate layer:
`shared/domain/events/command-decoders.ts` checks the shape before any use case runs, and
`party/utils/client-command-parser.ts` refuses a frame that fails to decode (`INVALID_COMMAND` for
a malformed field).

### Serialisation

`toJSON()` and `fromJSON()` copy every array and nested object, so a snapshot never aliases live
state, and a round trip keeps everything: bot difficulty, ruleset, expansion state, pending effects
and timers. The worker restores persisted rooms with `Game.fromJSON`. Every game works on its own
ruleset copy (`ensureRulesetConfig` returns a new object) and the `DEFAULT_*` rules are
deep-frozen.

At `ROUND_END`, `currentTrick` is still the last completed trick, because clients keep showing it
until the next deal. `getLastCompletedTrick()` names that explicitly.

### Determinism

`new Game(id, hostId, { random, clock })` takes an `IRandom` (the deck shuffle) and an `IClock`
(turn timer, grace, pause). Both default to `systemRandom` and `systemClock`, which read
`Math.random` and `Date.now`; production rooms use these defaults. The aggregate, projection and
bot use-case tests pass adapters from `shared/domain/ports`:

- `createSeededRandom(seed)` is a deterministic 32-bit generator; the same seed deals the same game.
- `createManualClock(start)` moves only when told to (`set`, `advance`).

A rematch keeps the adapters (`game.dependencies`), the ruleset and the bot levels. The bot AI
draws from `Math.random` and reads its deadline from an `IClock`, so a seeded `Game` fixes the deal
but not what a high-level bot plays. A room builds its own `Game` with the default adapters, so the
room harness (`party/test-support/room-harness.ts`) and the sandbox loopback server
(`src/infrastructure/sandbox/loopback-game-server.ts`) scope `Math.random` to a seeded generator
around every room entry point (`withSeededRandom` in
`src/infrastructure/sandbox/seeded-random.ts`). No randomness picks the first dealer: it is seat 0,
and the deal moves one seat per round.

## Hidden information and projections

`game.toJSON()` is the server's full truth and must never reach a client. Every per-seat view goes
through `createPersonalizedState` (`shared/application/projections/personalized-state.ts`):

- **Hands.** Other players' cards become `hidden` card backs.
- **Bids.** `game.getBidVisibility(viewerId)` is the single visibility policy. With hidden bids, a
  viewer sees only their own bid until everyone has bid. The forbidden bid encodes the sum of the
  other bids, so under hidden bids only the player it restricts sees it.
- **Juggler picks.** Other players' pending card choices are replaced by `hidden`.
- **Room data.** Kicked ids are dropped and room settings are cut to the fields the lobby shows.
- **Timer.** The turn timer state carries `serverNow` so clients can correct their clock.

`BID_PLACED` is broadcast only when `shouldShowBids` allows it
(`party/handlers/game-handlers.ts`, `party/bot/bot-turn.ts`). A private field you add must be
redacted in the projection and kept out of the broadcast events in
`shared/domain/events/game-events.ts`.

`getLegalPlays(state, playerId)` (`shared/application/projections/legal-plays.ts`) answers from a
serialised state with the same `legalPlays` the server enforces. The client store derives
`legalCardIds` from it once per snapshot
(`src/presentation/hooks/connection/game-client-state.ts`), so what a player can click is exactly
what the server accepts.

`BotBrain.buildGameContext` applies the same bid policy for bots, so a bot never knows more than a
human in its seat.

### Ties

`getStandings` uses competition ranking: tied scores share a rank and the next rank is skipped.
`GAME_COMPLETE` carries `standings` and `winnerIds`, and `winnerId` stays the first co-winner for
older clients. Stats placement, the game-end screen and telemetry all use this ranking.

## Bots

Code is in `shared/domain/bot-ai/`; the turn orchestration is in
`shared/application/use-cases/bot/`; the room drives it from `party/bot/bot-turn.ts`.

- **Rules.** `bot-ai/bot-rules.ts` is the bots' view of the rules policy: the lead, legal cards,
  the trick winner and void inference (`withSuitToFollow`). Behaviours are cached per card object.
  The Monte Carlo playouts, ISMCTS, alpha-beta, EPIMC, card inference and the heuristics all go
  through it, so simulations honour `lastWizardWins` and `lastJesterWins`.
- **Classic view.** The algorithms reason about the classic deck. `bot-ai/classic-view.ts` shows
  each special card as the classic card it behaves like (Dragon as a Wizard, Fairy and Witch as
  Jesters, Juggler and Cloud as number cards). Choices only special cards need (announcements,
  trump after a Werewolf swap, effect answers) are made by
  `bot-ai/strategies/special-card-strategy.ts` against the real game.
- **Information.** `GameContext` (`bot-ai/types.ts`) carries the visible bids only, the bot's own
  forbidden bid, every seat (`playerIds`), the explicit `lead`, the room's `cardRules` and the
  decision `budget`.
- **Time budget.** Every decision gets a `DecisionBudget`, an `IClock` deadline of
  `BOT_DECISION_BUDGET.DEFAULT_MS` (`shared/domain/constants/bot-ai.constants.ts`). Searches are
  anytime: they check the deadline between iterations or samples and return the best answer so far.
  `scaleIterations` shrinks iteration caps for small hands. The pause between bot moves
  (`ROOM_TIMING.BOT_ACTION_DELAY_MS`) is a separate server delay in
  [room-timing.config.ts](../../party/config/room-timing.config.ts), not compute time.
- **Brains.** `BotTurnUseCase` owns one brain per bot seat, and one use case exists per room
  registry, so no brain is shared across seats or rooms. A seat's brain is replaced when its
  difficulty changes. The Expert playing strategy rebuilds its beliefs from the public record on
  every decision and keeps no state between calls.
- **Safety net.** Each decision is checked with `isLegalBotAction`. A brain that throws, answers
  something illegal or answers nothing is replaced by `fallbackBotAction`
  (`shared/application/use-cases/bot/bot-fallback.ts`), a deterministic legal action marked with
  `fallbackReason`: the suit held most often, the lowest allowed bid, the first legal card, the
  first acceptable effect answer. The room logs fallbacks. When a bot move fails before it reaches
  the game and is still legal, the room retries once with `forceFallback`. When it is already
  applied (the game took it, then broadcasting failed), the room publishes the state instead of
  moving twice. When a bot cannot move at all, the room scheduler retries with backoff
  (`ROOM_TIMING.BOT_RETRY_BASE_MS`, `ROOM_TIMING.BOT_RETRY_MAX_MS`), so a failing bot never
  stalls the room.
- **Turn timeouts.** `TurnTimeoutUseCase` reuses the same fallback for a human whose timer ran out
  (see [Turn timers](rules.md#turn-timers)).

## Adding things

- **A rule option.** Add the field to its category interface, its default and its branch in
  `ensureRulesetConfig` (`shared/domain/value-objects/ruleset-config.ts`, plus its range in
  `RULESET_LIMITS` if numeric). Add it to the three hand-listed spots in `ruleset-validation.ts`
  (`validate*Rules`, `parse*RulesSafe`, `countNonDefaultRules`) and to `RULE_METADATA`
  (`ruleset-metadata.ts`). Implement it in the one module it belongs to, such as `trick-resolver.ts`
  for winners or `round-rules.ts` for bids and scoring. Then add a case to the reference oracle in
  `shared/application/use-cases/game/random-games.property.test.ts` and focused tests next to the
  rule. The default must keep the standard game.
- **A scoring, bidding or round-plan change.** Change `round-rules.ts`, the oracle and any copy of
  the rule outside the domain. See the checklist in the rules-change skill.
- **A special card.** Add the `CardType` and its place in `SPECIAL_CARD_TYPES`
  (`value-objects/card-types.ts`), its definition (`card-definitions.ts`) and catalog entry
  (`card-catalog.ts`), its preset in `expansion-sets.ts` if an edition ships it, its classic
  equivalent in `bot-ai/classic-view.ts`, its preview style (`bidding/mini-card-styles.ts`) and its
  face emblem. A card with a trick effect that does not exist yet also needs a handler in
  `trick-effects.ts`. The compiler flags every exhaustive registry you miss; the `switch`
  statements over `TrickEffectKind` in the client and the bots are not exhaustive, so grep them.
- **A hidden field.** Redact it in `createPersonalizedState` and keep it out of broadcast events.

The full step lists, including compatibility with running games and older clients, are in
[checklists.md](../../.claude/skills/rules-change/references/checklists.md).

## Tests

- `shared/domain/expansions/trick-lead.test.ts`: the lead and legality rules, including the led
  Wizard and the Jester-then-Wizard cases.
- `shared/domain/expansions/expansions.test.ts`: deck counts, trick resolution for the special-card
  ranks, follow suit, trump reveal and effect order.
- `shared/domain/entities/game-aggregate.test.ts`: the bidding and trump invariants, the round
  plan, the phase state machine including the pause, and the ports.
- `shared/domain/entities/game-aggregate-table.test.ts`: serialisation fidelity and aliasing, host
  and seat takeover, rematch, bot difficulty and standings.
- `shared/domain/entities/game-ruleset.test.ts`: the options as the aggregate applies them.
- `shared/domain/value-objects/ruleset-config.test.ts`: normalising rulesets.
- `shared/application/projections/projections.test.ts`: hidden bids, the forbidden bid, hands and
  the legal plays projection.
- `shared/domain/bot-ai/bot-rules.test.ts` and
  `shared/application/use-cases/bot/bot-turn.use-case.test.ts`: bot rule conformance, per-seat
  brains, budgets, fallbacks and the information bots see.
- `shared/application/use-cases/game/random-games.property.test.ts`: seeded random games through
  the use cases, checked against an independent oracle after every command. Set `PROPERTY_GAMES`
  for a deeper run.
- `shared/application/use-cases/game/special-cards.integration.test.ts`: staged tricks for each
  special card and full bot games with every special card in the deck.

The boundaries and how to run the suites are in [testing.md](../testing/testing.md).
