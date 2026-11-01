import { afterEach, describe, expect, it } from 'vitest';
import { GamePhase, ROOM_PLAYER_LIMITS, getStandings, getWinnerIds, type IPlayer } from '@shared/domain';
import type { BotDifficulty } from '@/presentation/components/lobby/table/lobby-view.types';
import type { RoomSettings } from '@/presentation/types';
import { ROOM_TIMING } from '../../party/config/room-timing.config';
import { ruleset } from '../../party/test-support/table-driver';
import { FullStackTable, type FullStackTableOptions } from './support/full-stack-table';
import { NotOfferedError, canMoveRoundOn } from './support/offers';
import type { PlayerClient } from './support/player-client';
import { view, type TableScreen } from './support/screen-model';

/**
 * Level 4, the golden path of a casual room: several humans and a bot from the lobby through the
 * rounds to the results and into a rematch, every player's screen checked against the room at
 * every rest (settle also runs I1-I6). Catches broken wiring anywhere between a click and the other
 * players' screens. Expected values come from the rules or from the room (`server.game`).
 */

interface TableSetup extends FullStackTableOptions {
  /** Join in this order; the first creates the room and hosts it. */
  humans: string[];
  /** Bots the host adds, by level. */
  bots?: BotDifficulty[];
  rounds: number;
}

interface SeatedTable {
  created: FullStackTable;
  players: PlayerClient[];
}

/** One step of the trick-banner watch (well below the flight and banner times). */
const WATCH_STEP_MS = 50;
const SCOREBOARD_TIMING = { flightMs: 400, bannerMs: 900 };
const EMOTE = 'thumbs_up';
/**
 * Three humans who all bid the lowest allowed bid (0) in a one-round game: exactly one of them
 * takes the only trick, so the other two share the best score. The seeds vary deal and winner.
 */
const TIE_SEEDS = [3, 17, 29];

function roomSettings(rounds: number): RoomSettings {
  return { name: 'Golden path', isPublic: false, maxPlayers: ROOM_PLAYER_LIMITS.MAX, rulesetConfig: ruleset({ rounds }) };
}

/** The page the rules of the site put a player on in each phase. */
function pageIn(phase: GamePhase, roomId: string): string {
  if (phase === GamePhase.LOBBY) return `/lobby/${roomId}`;
  if (phase === GamePhase.GAME_END) return `/results/${roomId}`;
  return `/game/${roomId}`;
}

function tableOf(player: PlayerClient): TableScreen {
  const { table } = view(player);
  if (!table) throw new Error(`${player.name}'s screen shows no table`);
  return table;
}

type Outcome = [id: string, score: number, tricksWon: number];

/** What a trick or a round changes on the scoreboard. */
function outcomes(players: readonly Pick<IPlayer, 'id' | 'score' | 'tricksWon'>[]): Outcome[] {
  return players.map((player) => [player.id, player.score, player.tricksWon]);
}

function seatsOf(players: readonly Pick<IPlayer, 'id' | 'name' | 'isBot' | 'botDifficulty'>[]) {
  return players.map((player) => ({ id: player.id, name: player.name, isBot: player.isBot, botDifficulty: player.botDifficulty }));
}

describe('golden path', () => {
  let table: FullStackTable | null = null;

  afterEach(() => {
    table?.dispose();
    table = null;
  });

  async function openTable({ humans, bots = [], rounds, ...options }: TableSetup): Promise<SeatedTable> {
    const created = await FullStackTable.create(options);
    table = created;
    const players: PlayerClient[] = [];
    for (const name of humans) {
      const player = created.open(created.browser(), name);
      await player.join(players.length === 0 ? roomSettings(rounds) : undefined);
      players.push(player);
    }
    for (const level of bots) players[0].addBot(level);
    await created.settle();
    return { created, players };
  }

  // Regression: any lost or misrouted event, a page that does not follow the phase, a scoreboard
  // that drifts from the room, or final standings that rank differently from the rules.
  it('three players and a bot play a two-round game from lobby to results, and every screen agrees at every step', async () => {
    const { created, players } = await openTable({
      seed: 11,
      network: { latencyMs: 30, jitterMs: 20 },
      humans: ['Ann', 'Ben', 'Cleo'],
      bots: [2],
      rounds: 2,
    });
    const { roomId } = created;
    const seatIds = created.server.game.players.map((seat) => seat.id);
    for (const player of players) {
      expect(view(player).page).toBe(pageIn(GamePhase.LOBBY, roomId));
      expect(view(player).lobby?.seats.map((seat) => seat.id)).toEqual(seatIds);
    }

    players[0].start();
    const seen = { phases: new Set<GamePhase>(), rounds: new Set<number>() };
    await created.playUntil(() => {
      const { phase, currentRound, players: seats } = created.server.game;
      seen.phases.add(phase);
      seen.rounds.add(currentRound);
      for (const player of players) {
        expect(view(player).page, `${player.name}'s page in ${phase}`).toBe(pageIn(phase, roomId));
        expect(outcomes(tableOf(player).standings.players), `${player.name}'s scoreboard in ${phase}`).toEqual(outcomes(seats));
      }
      return phase === GamePhase.GAME_END;
    });

    // The journey went through every stage of a game, both rounds included.
    expect([...seen.phases]).toEqual(expect.arrayContaining([GamePhase.BIDDING, GamePhase.PLAYING, GamePhase.ROUND_END, GamePhase.GAME_END]));
    expect([...seen.rounds]).toEqual(expect.arrayContaining([1, 2]));
    const ranking = getStandings(created.server.game.players);
    for (const player of players) {
      expect(getStandings(tableOf(player).standings.players)).toEqual(ranking);
      // Round n deals n cards, so the two rounds had 1 + 2 tricks; each was presented once.
      expect(player.table.presentedTricks).toBe(1 + 2);
    }
  });

  // Regression: a snapshot applied straight to the scoreboard, spoiling the trick's winner and the
  // round score while the cards are still flying in.
  it("shows a trick's outcome on the scoreboard only once that client presents the trick result", async () => {
    const { created, players } = await openTable({
      seed: 5,
      tableTiming: SCOREBOARD_TIMING,
      humans: ['Ann', 'Ben', 'Cleo'],
      rounds: 2,
    });
    const game = () => created.server.game;
    players[0].start();
    // Up to the last card of round one: that trick ends the round, so it changes every score.
    await created.playUntil(() => game().phase === GamePhase.PLAYING
      && (game().currentTrick?.cards.length ?? 0) === game().players.length - 1);
    const before = outcomes(game().players);
    const scored = () => JSON.stringify(outcomes(game().players)) !== JSON.stringify(before);
    const presentedBefore = players.map((player) => player.table.presentedTricks);
    const mover = players.find((player) => player.seatId === game().getCurrentPlayer().id);
    if (!mover) throw new Error('no human holds the last turn of the trick');

    mover.play();
    let heldBack = 0;
    for (let elapsed = 0; elapsed <= SCOREBOARD_TIMING.flightMs + SCOREBOARD_TIMING.bannerMs; elapsed += WATCH_STEP_MS) {
      await created.advance(WATCH_STEP_MS);
      players.forEach((player, index) => {
        const shown = outcomes(tableOf(player).standings.players);
        if (player.table.presentedTricks > presentedBefore[index]) {
          expect(shown, `${player.name}'s scoreboard once its trick banner showed`).toEqual(outcomes(game().players));
          return;
        }
        expect(shown, `${player.name}'s scoreboard before its trick banner`).toEqual(before);
        if (scored() && player.surface().presentation.pendingTrickResult) heldBack += 1;
      });
    }

    // Preconditions: the room had scored the trick while clients were still landing its cards.
    expect(scored()).toBe(true);
    expect(heldBack).toBeGreaterThan(0);
    expect(players.map((player) => player.table.presentedTricks)).toEqual(presentedBefore.map((count) => count + 1));
    await created.settle();
  });

  // Regression: a round end that waits forever for an idle host, or one that advances twice (the
  // round-end timer of a round the host moved on moving the next round on as well).
  it('lets the host move a finished round on, and moves it on by itself when nobody does', async () => {
    const { created, players } = await openTable({ seed: 7, humans: ['Ann', 'Ben'], bots: [2], rounds: 3 });
    const [ann, ben] = players;
    const game = () => created.server.game;
    const roundsShown = () => players.map((player) => tableOf(player).game.currentRound);
    const halfTheWait = ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS / 2;
    ann.start();

    await created.playUntil(() => game().phase === GamePhase.ROUND_END);
    expect(canMoveRoundOn(view(ann))).toBe(true);
    expect(() => ben.nextRound()).toThrow(NotOfferedError);
    ann.nextRound();
    await created.settle();
    expect(game().currentRound).toBe(2);
    expect(roundsShown()).toEqual([2, 2]);
    await created.advance(ROOM_TIMING.ROUND_END_AUTO_ADVANCE_MS);
    await created.settle();
    expect(game().currentRound).toBe(2);

    await created.playUntil(() => game().phase === GamePhase.ROUND_END);
    expect(game().currentRound).toBe(2);
    await created.advance(halfTheWait);
    expect(game().phase).toBe(GamePhase.ROUND_END);
    for (const player of players) expect(tableOf(player).showRoundEndUI).toBe(true);
    await created.advance(halfTheWait);
    await created.settle();

    expect(game().currentRound).toBe(3);
    expect(game().phase).not.toBe(GamePhase.ROUND_END);
    for (const player of players) expect(view(player).page).toBe(pageIn(game().phase, created.roomId));
    expect(roundsShown()).toEqual([3, 3]);
  });

  // Regression: a results screen that ranks tied players differently from the rules (a co-winner
  // shown second, or the client's final scores drifting from the room's). The ranking rule itself
  // is owned at level 1 (standings.service).
  it.each(TIE_SEEDS)('shows every co-winner first on every results screen (seed %i)', async (seed) => {
    const { created, players } = await openTable({ seed, humans: ['Ann', 'Ben', 'Cleo'], rounds: 1 });
    players[0].start();
    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);

    const final = created.server.game.players;
    const best = Math.max(...final.map((seat) => seat.score));
    const coWinners = final.filter((seat) => seat.score === best).map((seat) => seat.id);
    expect(coWinners.length, 'precondition: the game ended in a tie').toBeGreaterThan(1);
    for (const player of players) {
      expect(view(player).page).toBe(pageIn(GamePhase.GAME_END, created.roomId));
      const shown = tableOf(player).standings.players;
      expect(getWinnerIds(shown), `${player.name}'s winners`).toEqual(coWinners);
      expect(getStandings(shown).slice(0, coWinners.length).map((standing) => standing.playerId)).toEqual(coWinners);
    }
  });

  // Regression: stale chat, emotes, bid bubbles, presented tricks or scores surviving
  // REMATCH_STARTED, or a rematch that forgets the rules or the bots' levels.
  it('starts a rematch with the same rules and bot levels, clears every feed and trick, and resets scores on all clients', async () => {
    const { created, players } = await openTable({ seed: 23, humans: ['Ann', 'Ben'], bots: [4], rounds: 1 });
    const [ann, ben] = players;
    ann.start();
    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);
    ben.chat('good game');
    ann.emote(EMOTE);
    await created.settle();
    for (const player of players) {
      // Preconditions: there is something the rematch has to clear.
      expect(view(player).feeds.chatMessages.length).toBeGreaterThan(0);
      expect(view(player).feeds.emotes.length).toBeGreaterThan(0);
      expect(player.table.presentedTricks).toBe(1);
    }
    const rules = JSON.parse(JSON.stringify(created.server.game.rulesetConfig)) as unknown;
    const seats = seatsOf(created.server.game.players);

    ann.rematch();
    await created.settle();
    for (const player of players) {
      const screen = view(player);
      const shown = player.state.serverState;
      expect(screen.page).toBe(pageIn(GamePhase.LOBBY, created.roomId));
      expect(shown?.rulesetConfig).toEqual(rules);
      expect(seatsOf(shown?.players ?? [])).toEqual(seats);
      expect(shown?.players.map((seat) => seat.score)).toEqual(seats.map(() => 0));
      expect(screen.feeds).toMatchObject({ chatMessages: [], emotes: [], bidEvents: [], specialCardNotices: [] });
      expect(screen.timeoutSounds).toEqual([]);
      const { trickResult, pendingTrickResult, frozenTrick, visiblePlayedCardIds } = player.surface().presentation;
      expect({ trickResult, pendingTrickResult, frozenTrick, visibleCards: visiblePlayedCardIds.size })
        .toEqual({ trickResult: null, pendingTrickResult: null, frozenTrick: null, visibleCards: 0 });
    }

    ann.start();
    await created.playUntil(() => created.server.game.phase === GamePhase.GAME_END);
    for (const player of players) {
      expect(view(player).page).toBe(pageIn(GamePhase.GAME_END, created.roomId));
      // One trick per one-round game, each presented once (the rematch's trick is a new trick).
      expect(player.table.presentedTricks).toBe(2);
    }
  });
});
