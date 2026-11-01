/**
 * The server's event contracts of a round and a game on the real GameRoom: the order of a trick's
 * events, the Bomb, special-card effects answered through RESOLVE_EFFECT, hidden bids, the end
 * of the game and the winner's trick-win sound.
 *
 * Tables with special cards are three humans in one round that deals every card, on seeded
 * rooms: each scenario takes the first seed whose deal reaches its precondition and asserts the
 * rule, never a particular card or score of a seed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CardType,
  ClientCommandType,
  DEFAULT_RULESET_CONFIG,
  GameEventType,
  GamePhase,
  RULESET_LIMITS,
  Suit,
  TRICK_WIN_SOUND_NAMES,
  TrickEffectKind,
  type IGameState,
  type IRulesetConfig,
  type SpecialCardType,
} from '../../shared/domain';
import { HARNESS_START_TIME, RoomHarness, type TestConnection, type WireMessage } from '../test-support/room-harness';
import { humanMove, lobby, playUntil, ruleset, startedTable, type Table } from '../test-support/table-driver';

const HUMANS = ['Hana', 'Pia', 'Otto'];
const SEEDS = [1, 2, 3, 4, 5, 6];
const MAX_STEPS = 300;

/** One round of the highest round count, dealt high to low: the first round deals every card. */
function dealEverything(specialCards: SpecialCardType[]): IRulesetConfig {
  const rules = ruleset({ rounds: RULESET_LIMITS.CUSTOM_ROUND_COUNT.MAX });
  return { ...rules, structure: { ...rules.structure, descendingRounds: true }, expansions: { specialCards } };
}

/** The simplest legal answer of whoever the table waits for (special cards included). */
function act(t: Table): boolean {
  const game = t.h.game;
  if (game.phase !== GamePhase.PLAYING) return humanMove(t);
  const effect = game.getActiveEffect();
  if (effect) {
    const [playerId] = game.getAwaitingEffectPlayerIds();
    const socket = t.seats.get(playerId);
    if (!socket) return false;
    const card = game.getPlayer(playerId)?.hand[0];
    const response = effect.kind === TrickEffectKind.PASS_LEFT
      ? { kind: effect.kind, cardId: card?.id }
      : { kind: TrickEffectKind.ADJUST_BID, delta: 1 };
    t.h.send(socket, { type: ClientCommandType.RESOLVE_EFFECT, response });
    return true;
  }
  const current = game.getCurrentPlayer();
  const [card] = game.getLegalPlays(current.id);
  const socket = t.seats.get(current.id);
  if (!card || !socket) return false;
  t.h.send(socket, { type: ClientCommandType.PLAY_CARD, cardId: card.id, declaration: { suit: Suit.GIANTS } });
  return true;
}

function drive(t: Table, done: () => boolean): void {
  for (let step = 0; step < MAX_STEPS && !done(); step++) {
    if (!act(t)) throw new Error(`nobody can act in ${t.h.game.phase}`);
  }
  if (!done()) throw new Error(`stuck in ${t.h.game.phase}`);
}

const typesOf = (socket: TestConnection) => socket.messages().map((message) => message.type);
const stateOf = (message: WireMessage | undefined) => message?.state as IGameState | undefined;

/** Each completed trick as the wire carried it: from its last card to the snapshot after it. */
function trickSequences(socket: TestConnection): string[][] {
  const types = typesOf(socket);
  return types.flatMap((type, index) => {
    if (type !== GameEventType.TRICK_COMPLETE) return [];
    const snapshot = types.indexOf(GameEventType.GAME_STATE, index);
    return [types.slice(index - 1, snapshot === -1 ? types.length : snapshot + 1)];
  });
}

describe('round flow', () => {
  const harnesses: RoomHarness[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(HARNESS_START_TIME);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const harness of harnesses.splice(0)) harness.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function table(rules: IRulesetConfig, seed?: number): Promise<Table> {
    const h = await RoomHarness.create(seed === undefined ? {} : { seed });
    harnesses.push(h);
    return startedTable(HUMANS, 0, rules, h);
  }

  /** The first seeded table whose round reaches `reached` (checked after every move). */
  async function firstSeedWhere(rules: IRulesetConfig, reached: (t: Table) => boolean): Promise<Table> {
    for (const seed of SEEDS) {
      const t = await table(rules, seed);
      drive(t, () => reached(t) || t.h.game.phase === GamePhase.ROUND_END);
      if (reached(t)) return t;
    }
    throw new Error(`no seed of ${SEEDS.join(', ')} reaches the scenario`);
  }

  it("sends CARD_PLAYED, TRICK_COMPLETE and the trick's effects before the snapshot that follows them", async () => {
    // A Cloud trick won by a player who bid zero raises that bid at once: an effect of the play itself.
    const t = await firstSeedWhere(dealEverything([CardType.CLOUD]), ({ h, sockets }) =>
      h.game.phase === GamePhase.ROUND_END &&
      trickSequences(sockets.Hana).some((sequence) => sequence.includes(GameEventType.TRICK_EFFECT_RESOLVED)));

    for (const socket of Object.values(t.sockets)) {
      const sequences = trickSequences(socket);
      expect(sequences).toHaveLength(t.h.game.completedTricks.length);
      for (const sequence of sequences) {
        const only = (type: string) => sequence.filter((candidate) => candidate === type);
        expect(sequence).toEqual([
          GameEventType.CARD_PLAYED,
          GameEventType.TRICK_COMPLETE,
          ...only(GameEventType.TRICK_EFFECT_RESOLVED),
          ...only(GameEventType.ROUND_COMPLETE),
          GameEventType.GAME_STATE,
        ]);
      }
    }
  });

  it('voids a Bomb trick without a winner sound and lets the would-be winner lead', async () => {
    const voided = (socket: TestConnection) => socket.messages().findIndex((m) => m.type === GameEventType.TRICK_COMPLETE && m.voided);
    const t = await firstSeedWhere(dealEverything([CardType.BOMB]), ({ h, sockets }) =>
      voided(sockets.Hana) !== -1 && h.game.phase === GamePhase.PLAYING);

    for (const socket of Object.values(t.sockets)) {
      const messages = socket.messages();
      const index = voided(socket);
      const after = stateOf(messages.slice(index).find((m) => m.type === GameEventType.GAME_STATE));
      const credited = messages.slice(0, index).filter((m) => m.type === GameEventType.TRICK_COMPLETE && !m.voided).length;
      expect(after?.players[after.currentPlayerIndex]?.id).toBe(messages[index].winnerId);
      expect(after?.players.reduce((sum, p) => sum + p.tricksWon, 0)).toBe(credited);
      // Every trick sounds its winner's victory, except one nobody won.
      for (const trick of socket.ofType(GameEventType.TRICK_COMPLETE)) {
        expect(trick.soundChoice === undefined).toBe(trick.voided === true);
      }
    }
  });

  it('sends GAME_COMPLETE with the final standings, ties included, then the GAME_END snapshot', async () => {
    // One card each and everyone bids zero: the trick's winner misses, the other two tie.
    const t = await table(ruleset({ rounds: 1 }));
    drive(t, () => t.h.game.phase === GamePhase.GAME_END);
    const { baseBidPoints, penaltyPerMiss } = DEFAULT_RULESET_CONFIG.scoring;
    expect(t.sockets.Hana.ofType(GameEventType.BID_PLACED).map((event) => event.bid)).toEqual([0, 0, 0]);
    const loser = t.sockets.Hana.ofType(GameEventType.TRICK_COMPLETE)[0]?.winnerId;
    const tied = t.h.game.players.map((p) => p.id).filter((id) => id !== loser);

    for (const socket of Object.values(t.sockets)) {
      const messages = socket.messages();
      const end = typesOf(socket).indexOf(GameEventType.GAME_COMPLETE);
      expect(typesOf(socket).filter((type) => type === GameEventType.GAME_COMPLETE)).toHaveLength(1);
      expect(messages[end]).toMatchObject({ winnerId: tied[0], winnerIds: tied });
      expect(messages[end].standings).toEqual([
        { playerId: tied[0], score: baseBidPoints, rank: 1 },
        { playerId: tied[1], score: baseBidPoints, rank: 1 },
        { playerId: loser, score: -penaltyPerMiss, rank: tied.length + 1 },
      ]);
      expect(messages[end + 1]?.type).toBe(GameEventType.GAME_STATE);
      expect(stateOf(messages[end + 1])?.phase).toBe(GamePhase.GAME_END);
    }
  });

  it("broadcasts the winner's custom trick-win sound, resolving a random preference to a playable sound", async () => {
    const sting = { id: 'custom-trick-win', name: 'Victory sting', dataUrl: 'data:audio/wav;base64,AAAA', size: 128, duration: 1.2 };
    const [chosenSound] = TRICK_WIN_SOUND_NAMES;
    for (const seed of SEEDS) {
      const h = await RoomHarness.create({ seed });
      harnesses.push(h);
      const t = await lobby(['Hana', 'Pia'], { rulesetConfig: dealEverything([]) }, h);
      const { Hana: hana, Pia: pia } = t.sockets;
      h.send(hana, { type: ClientCommandType.UPDATE_SOUND_PREFERENCES, preferences: { trickWinSound: 'random' } });
      h.send(pia, {
        type: ClientCommandType.UPDATE_SOUND_PREFERENCES,
        preferences: { trickWinSound: chosenSound, customTrickWinAudio: sting },
      });
      h.send(hana, { type: ClientCommandType.ADD_BOT, difficulty: 2 });
      h.send(hana, { type: ClientCommandType.START_GAME });
      await playUntil(t, () => h.game.phase === GamePhase.ROUND_END);

      const tricks = hana.ofType(GameEventType.TRICK_COMPLETE);
      expect(pia.ofType(GameEventType.TRICK_COMPLETE)).toEqual(tricks);
      for (const trick of tricks) {
        if (trick.winnerId === h.seatOf(pia)) {
          expect(trick).toMatchObject({ soundChoice: chosenSound, customTrickWinAudio: sting });
        } else {
          expect(TRICK_WIN_SOUND_NAMES).toContain(trick.soundChoice);
          expect(trick.customTrickWinAudio).toBeUndefined();
        }
      }
      const finishedByBot = (trick: WireMessage) =>
        h.game.getPlayer((trick.trickCards as { playerId: string }[]).at(-1)?.playerId ?? '')?.isBot === true;
      const piaWon = tricks.some((trick) => trick.winnerId === h.seatOf(pia));
      const hanaWonFromBot = tricks.some((trick) => trick.winnerId === h.seatOf(hana) && finishedByBot(trick));
      if (piaWon && hanaWonFromBot) return;
    }
    throw new Error(`no seed of ${SEEDS.join(', ')} gives Pia a trick and Hana one the bot completed`);
  });

  it('resolves Juggler passes only after every holder chose, through RESOLVE_EFFECT frames', async () => {
    const t = await firstSeedWhere(dealEverything([CardType.JUGGLER]), ({ h }) =>
      h.game.getActiveEffect()?.kind === TrickEffectKind.PASS_LEFT);
    const { h, seats } = t;
    const passers = h.game.getAwaitingEffectPlayerIds();
    expect(passers).toEqual(h.game.players.map((p) => p.id));
    const socketOf = (id: string): TestConnection => {
      const socket = seats.get(id);
      if (!socket) throw new Error(`no socket plays ${id}`);
      return socket;
    };
    const handOf = (id: string) => socketOf(id).lastState()?.players.find((p) => p.id === id)?.hand.map((c) => c.id) ?? [];
    const selectionSeen = (viewer: string, passer: string) => {
      const effect = socketOf(viewer).lastState()?.pendingEffects?.[0];
      return effect?.kind === TrickEffectKind.PASS_LEFT ? effect.selections[passer] : undefined;
    };
    const resolved = () => [...seats.values()].map((socket) => socket.ofType(GameEventType.TRICK_EFFECT_RESOLVED).length);
    const before = resolved();
    const chosen = passers.map((id) => handOf(id)[0]);

    passers.forEach((id, index) => {
      h.send(socketOf(id), { type: ClientCommandType.RESOLVE_EFFECT, response: { kind: TrickEffectKind.PASS_LEFT, cardId: chosen[index] } });
      if (index === passers.length - 1) return;
      expect(resolved()).toEqual(before);
      expect(handOf(id)).toContain(chosen[index]);
      expect(selectionSeen(id, id)).toBe(chosen[index]);
      expect(selectionSeen(passers[index + 1], id)).toBe('hidden');
    });

    for (const socket of seats.values()) {
      expect(socket.ofType(GameEventType.TRICK_EFFECT_RESOLVED).at(-1)).toMatchObject({
        outcome: { kind: TrickEffectKind.PASS_LEFT, playerIds: passers },
      });
    }
    expect(resolved()).toEqual(before.map((count) => count + 1));
    passers.forEach((id, index) => {
      expect(handOf(id)).not.toContain(chosen[index]);
      expect(handOf(passers[(index + 1) % passers.length])).toContain(chosen[index]);
    });
  });

  it('announces no bid while bids are hidden, and the last one once every bid is in', async () => {
    const t = await table({ ...ruleset({ rounds: 1 }), bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true } });
    drive(t, () => t.h.game.phase === GamePhase.BIDDING);
    const sockets = Object.values(t.sockets);
    const bids = (socket: TestConnection) => socket.lastState()?.players.map((p) => p.bid) ?? [];

    for (let placed = 1; placed < HUMANS.length; placed++) {
      humanMove(t);
      for (const socket of sockets) {
        expect(socket.ofType(GameEventType.BID_PLACED)).toHaveLength(0);
        const own = socket.lastState()?.players.find((p) => p.id === t.h.seatOf(socket));
        expect(bids(socket).filter((bid) => bid !== null)).toEqual(own?.bid === null ? [] : [own?.bid]);
      }
    }

    humanMove(t);
    expect(t.h.game.phase).not.toBe(GamePhase.BIDDING);
    for (const socket of sockets) {
      expect(socket.ofType(GameEventType.BID_PLACED)).toHaveLength(1);
      expect(bids(socket).every((bid) => bid !== null)).toBe(true);
    }
  });
});
