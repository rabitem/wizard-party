# Game rules

The game as players see it: the deck, the rounds, trump, bidding, tricks, scoring, the house-rule
options a host can switch on and the expansion special cards. Read this page to know what the
game does. Read [engine.md](engine.md) to know where each rule is implemented and how to change it.

The rules follow the classic trick-taking game Wizard and the card sets of its anniversary
editions. This page describes them in the project's own words. Wizard Party is an unofficial fan
project; the trademark notice is `TRADEMARK_DISCLAIMER` in
[legal.config.ts](../../src/presentation/config/legal.config.ts) and in
[THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## The table

| Fact | Value | Source |
| --- | --- | --- |
| Players | 3 to 6; the host can add bots | `ROOM_PLAYER_LIMITS` in `shared/domain/entities/room-settings.ts` |
| Suits | Giants, Elves, Dwarves, Humans | `SUIT_NAMES` in `shared/domain/value-objects/card-types.ts` |
| Seat order | Fixed for the game; play moves to the next seat | `shared/domain/entities/game-round.ts` |
| First dealer | Seat 0, then the deal moves one seat per round | `GameRound.start`, `startNextRound` |

## The deck

The classic deck has 60 cards (`CLASSIC_DECK_SIZE` in
`shared/domain/expansions/deck-composition.ts`):

| Cards | Copies | Notes |
| --- | --- | --- |
| Number cards 1 to 13 | One per suit, 52 in all | The only cards that must follow suit |
| Wizard | 4 | Wins the trick; leading one frees the trick from suit |
| Jester | 4 | Loses to every number card and Wizard; wins a trick of only Jesters |

The host can add special cards from the anniversary editions (see [Special cards](#special-cards)).
They make the deck bigger but never change the number of rounds.

## Rounds and dealing

The number of rounds is the classic deck size divided by the player count, rounded down: 20 rounds
for 3 players, 15 for 4, 12 for 5 and 10 for 6 (`getRoundCount` in
`shared/domain/expansions/round-rules.ts`). Round `n` deals `n` cards to each player, so the game
starts with one card each, and the last round of a default game deals the whole deck. The
`descendingRounds` option reverses the order, and `customRoundCount` sets the number of rounds,
capped at the deck limit.

After the deal, the next card of the deck is turned up to decide trump. When the deal uses the
whole deck there is nothing to turn up and the round has no trump. In a classic game that is the
round with the most cards. Special cards make the deck larger, so a card is left to turn up even
in the largest round.

## Trump

What the turned-up card does is decided per card type (`trumpReveal` in
`shared/domain/expansions/card-definitions.ts`, applied by `revealTrump` in
`shared/domain/expansions/trump-reveal.ts`):

| Turned-up card | Result |
| --- | --- |
| Number card | Its suit is trump |
| Jester | No trump this round |
| Wizard | The dealer chooses a suit; "no trump" is not offered |
| Special cards | See the "As trump card" column under [Special cards](#special-cards) |

The dealer has seen their own hand when choosing. A trump suit beats every other suit in a trick.

## Bidding

Bidding starts with the player after the dealer and goes round the table, so the dealer bids last.
Each player bids once, a whole number of tricks from 0 up to the cards dealt (`isBidInRange`).

The hook rule applies to the last bidder only: they may not bid the number that makes all bids add
up to the number of tricks, so at least one player always misses (`computeForbiddenBid`). When the
others already bid more than the cards dealt, nothing is forbidden. The `allowEqualBids` option
switches the rule off.

With the `hiddenBids` option, players see only their own bid until everyone has bid. The forbidden
bid reveals the sum of the other bids, so only the last bidder sees it.

## Playing tricks

The player after the dealer leads the first trick. The winner of a trick leads the next one. Every
player plays one card per trick.

### Leading and following

The first suited card of a trick sets the lead suit: a number card, or a Juggler or Cloud in its
announced suit. Jesters, and the low special cards, played before it do not set a suit. A card that
counts as a Wizard or Dragon, played before any suited card, frees the trick: nobody has to follow
suit for the rest of it, even after later number cards.

### Legal plays

A player who holds a number card of the lead suit must play one, or any card that is always
playable: Wizards, Jesters and every special card. A player without one may play anything. Only
number cards oblige a player to follow suit (`legalPlays` in
`shared/domain/expansions/card-rules.ts`).

### Who wins

The strongest class wins, strongest first:

1. Dragon (special card). The Fairy wins the trick instead when both are in it.
2. Wizard. The first one played wins, or the last with the `lastWizardWins` option.
3. Suited cards: the highest trump, otherwise the highest card of the lead suit. Other suits never
   win. A Juggler counts as 7.5 and a Cloud as 9.75 in the suit announced for them.
4. Jester. The first Jester played wins when nothing stronger is in the trick. With the
   `lastJesterWins` option, the last one wins a trick made only of Jesters.
5. Fairy, then Witch (special cards): in a trick of only low cards, the earliest card of the
   strongest class present wins.

A trick containing the Bomb has no winner whatever the cards; see [Special cards](#special-cards).
Special cards that count as a Jester take part in the Jester rules above.

`resolveTrick` in `shared/domain/expansions/trick-resolver.ts` holds this order.

## Scoring

A round scores each player from their bid and the tricks they won (`scoreRound`):

- Exact bid: base points plus points per trick won (20 plus 10 a trick by default).
- Missed bid: a penalty for each trick over or under the bid (10 a trick by default).

Bid 3 and win 3 scores 50. Bid 0 and win 0 scores 20. Bid 2 and win 4 scores minus 20. The three
numbers are options (see [Rule options](#rule-options)).

After the last round the highest total score wins. Tied scores share a rank and every player on
the best score wins (`getStandings` and `getWinnerIds` in
`shared/domain/services/standings.service.ts`).

## Rule options

The host sets options in the lobby; they are fixed once the game starts. Every option is a field
of `IRulesetConfig` in `shared/domain/value-objects/ruleset-config.ts`, and the defaults in
`DEFAULT_RULESET_CONFIG` are the standard game. Numeric ranges are in `RULESET_LIMITS`,
`TURN_TIMER_LIMITS` and `TIMEOUT_SOUND_VOLUME_LIMITS` in the same file. The settings screen
(`src/presentation/components/settings/RulesetSection.tsx`) builds its labels from
`RULE_METADATA` in `shared/domain/value-objects/ruleset-metadata.ts`.

| Option (`category.key`) | Default | Effect |
| --- | --- | --- |
| `card.lastWizardWins` | off | Among several Wizards, the last one played wins |
| `card.lastJesterWins` | off | In a trick of only Jesters, the last one played wins |
| `bidding.hiddenBids` | off | Bids stay hidden until everyone has bid |
| `bidding.allowEqualBids` | off | The last bidder may make the bids add up to the tricks (no hook rule) |
| `scoring.baseBidPoints` | 20 | Points for an exact bid |
| `scoring.pointsPerTrick` | 10 | Extra points per trick won on an exact bid |
| `scoring.penaltyPerMiss` | 10 | Points lost per trick over or under the bid |
| `structure.customRoundCount` | automatic | Plays fewer rounds; capped at the deck limit |
| `structure.descendingRounds` | off | Starts with the most cards and deals one fewer each round |
| `turn.biddingTimerSeconds` | off | Countdown for bidding and for choosing trump |
| `turn.playTimerSeconds` | off | Countdown for playing a card |
| `turn.timeoutSoundVolume` | full volume | Volume of the timeout sounds |
| `expansions.specialCards` | none | Special cards added to the deck |

### Turn timers

When a countdown runs out, the other players may play timeout sounds at the slow player. In
`auto-act` mode, the configured one, the room plays the move a failing bot would play after a
further delay: the lowest allowed bid, the first legal card, the suit held most often for trump.
The mode and the delay are `TURN_TIMEOUT_POLICY` in
[room-timing.config.ts](../../party/config/room-timing.config.ts). A ruleset that sets a play timer
and omits the bidding timer gets one derived from it (`getDefaultBiddingTimerSeconds`).

### Repairing values

`ensureRulesetConfig` fills missing or invalid values with the defaults and truncates the
whole-number options (points, round count, timer seconds). Tournaments use the strict
`validateRulesetConfig` in `shared/domain/value-objects/ruleset-validation.ts`, which rejects
invalid values instead.

## Special cards

Nine special cards from the anniversary editions can be shuffled into the deck, one copy each. The
host picks cards one by one or starts from an edition preset (`EXPANSION_SETS` in
`shared/domain/expansions/expansion-sets.ts`):

| Preset | Cards |
| --- | --- |
| Classic | None |
| 20th Anniversary (2016) | Dragon, Fairy, Bomb, Werewolf, Juggler, Cloud |
| 25th Anniversary (2021) | The 20th Anniversary cards and the Shapeshifter |
| 30th Anniversary (2026) | All nine, adding the Vampire and the Witch |

Dragon and Fairy are paired: selecting one selects the other (`SPECIAL_CARD_PAIRS` in
`shared/domain/value-objects/expansion-rules.ts`), because the Fairy is the only answer to the
Dragon.

Every special card is always playable, so none of them ever has to follow suit. The names, rank
lines and rule text the game shows come from `CARD_CATALOG` in
`shared/domain/expansions/card-catalog.ts`; this table paraphrases it.

| Card | Strength | When played | As trump card |
| --- | --- | --- | --- |
| Dragon | Beats Wizards and wins every trick it is in, unless the Fairy is in it | Nothing to announce | Dealer chooses trump |
| Fairy | Loses to every card except the Witch, even a Jester, but wins any trick that holds the Dragon | Nothing to announce | No trump |
| Bomb | Voids the trick: nobody scores it, and the player whose card would have won leads next | Nothing to announce | No trump |
| Werewolf | Counts as a Jester when played | Swapped for the trump card before bidding (see below) | Set aside, the next card is turned up |
| Juggler | A 7.5 in a suit its player announces | Announce a suit, trump allowed; afterwards everyone passes a card left | Dealer chooses trump |
| Cloud | A 9.75 in a suit its player announces | Announce a suit, trump allowed; the trick winner moves their bid by one | Dealer chooses trump |
| Shapeshifter | A Wizard or a Jester | Announce which form it takes; it counts as that card | Dealer chooses trump |
| Vampire | Copies the turned-up trump card | Becomes that card, effects included | Dealer chooses trump |
| Witch | Below the Jester and the Fairy | After the trick, swap a hand card with a trick card | No trump |

### Werewolf

When a card is turned up and a player holds the Werewolf, that player swaps it for the turned-up
card before bidding and names the trump suit, or no trump. A Werewolf that is turned up itself is
set aside and the next card is turned up. A Werewolf that is never swapped, because no card was
turned up, plays as a Jester.

### Vampire

It copies the card that was turned up at the start of the round, also when a Werewolf holder then
took that card. With nothing to copy it plays as a Jester. Copying a Juggler, Cloud or Shapeshifter
means making that card's announcement.

### Effects after a trick

Juggler, Cloud and Witch ask players for a choice once the trick is decided. The choices resolve one
at a time in that order, and nobody plays a card until they are all done:

- **Juggler.** Every player picks one hand card to pass to the next seat. The picks are secret and
  swap at once. Skipped after the last trick of the round.
- **Cloud.** The player who won the trick raises or lowers their bid by one. A bid of 0 can only go
  up. A voided trick has no winner, so the Cloud does nothing.
- **Witch.** Her player puts a hand card into the trick and takes any other trick card, except the
  Witch, into their hand. Skipped after the last trick of the round.

The order and the skips live in `deriveTrickEffects`
(`shared/domain/expansions/trick-effects.ts`).

## In-app text

The special-card wording comes from the catalog; the classic wording is written by hand.

| Surface | File | Rules text from |
| --- | --- | --- |
| Tutorial | `src/presentation/components/TutorialModal.tsx` | Hand-written chapters; the special-cards chapter renders `SPECIAL_CARD_TYPES` through `getCardCatalogEntry` |
| "New to Wizard?" entry in the room browser | `src/presentation/components/room-browser/LearnToPlaySection.tsx` | A button that opens the tutorial; no rules text |
| Edition guide and carousel | `src/presentation/components/expansion-guide/` | `getCardCatalogEntry` and `EXPANSION_SETS` |

The tutorial states the standard rules: scoring as 20 plus 10 a trick and minus 10 a trick off,
bidding with the hook rule on the dealer, and a trump card after every deal. It does not follow a
room's options, and it does not say that the largest round has no trump card in a classic game.
Change the tutorial together with the rule it describes.

## Adding things

Every rule has one implementation, so a change to this page starts in the code:

- **A rule option, a scoring or bidding change, a special card or a trick effect.** Follow the
  checklists in [.claude/skills/rules-change](../../.claude/skills/rules-change/SKILL.md) and the
  steps in [engine.md](engine.md#adding-things).
- **Player-facing wording for a card.** Edit `shared/domain/expansions/card-catalog.ts`. The lobby,
  the tutorial, card faces and notices all read it.
- **Wording for an option.** Edit its `RULE_METADATA` entry.
- **Tutorial chapters.** Edit `TUTORIAL_STEPS` in `TutorialModal.tsx`.

Update this page in the same change.
