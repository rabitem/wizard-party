/**
 * What players send each other at the table on the real GameRoom: chat and emotes (to everyone
 * seated, within one social budget per seat) and the timeout soundboard, which opens on a real
 * turn timer running out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClientCommandType,
  GameEventType,
  JESTER_SOUND_NAMES,
  ProtocolErrorCode,
  TURN_TIMER_LIMITS,
} from '../../shared/domain';
import { COMMAND_RATE_LIMITS } from '../config/command-rate-limits.config';
import { HARNESS_START_TIME, type RoomHarness, type TestConnection } from '../test-support/room-harness';
import { lobby, refusalOf, ruleset, startedTable } from '../test-support/table-driver';

const SOCIAL_EVENTS: string[] = [GameEventType.CHAT_MESSAGE, GameEventType.EMOTE];

function socialFrames(socket: TestConnection) {
  return socket.messages().filter((message) => SOCIAL_EVENTS.includes(message.type));
}

/** A soundboard upload; `afk` says whether its owner put it on the timeout board. */
function uploadedSound(afk: boolean) {
  return {
    id: afk ? 'custom-afk' : 'custom-private',
    name: afk ? 'custom-afk.wav' : 'private.wav',
    dataUrl: 'data:audio/wav;base64,AAAA',
    size: 128,
    duration: 1,
    category: 'custom',
    roles: { wizard: false, jester: false, trick: false, afk, shared: false },
  };
}

describe('social', () => {
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

  describe('chat and emotes', () => {
    it('reach every seated player, with the chat text sanitized, and nobody who has not joined', async () => {
      const { h, sockets } = await lobby(['Hana', 'Pia']);
      harnesses.push(h);
      const hana = h.seatOf(sockets.Hana);
      const outsider = h.connect();

      h.send(sockets.Hana, { type: ClientCommandType.SEND_CHAT, message: 'hello <b>' });
      h.send(sockets.Hana, { type: ClientCommandType.SEND_EMOTE, emoteId: 'thumbs_up' });

      for (const socket of [sockets.Hana, sockets.Pia]) {
        expect(socialFrames(socket)).toEqual([
          expect.objectContaining({ type: GameEventType.CHAT_MESSAGE, playerId: hana, playerName: 'Hana', message: 'hello b' }),
          expect.objectContaining({ type: GameEventType.EMOTE, playerId: hana, playerName: 'Hana', emoteId: 'thumbs_up' }),
        ]);
      }
      expect(outsider.sent).toHaveLength(0);
    });

    it('share one budget per seat that a reconnect does not refill and time does', async () => {
      const { h, sockets } = await lobby(['Hana', 'Pia']);
      harnesses.push(h);
      const { burst, refillPerSecond } = COMMAND_RATE_LIMITS.social;
      const token = sockets.Hana.session()?.sessionToken;

      for (let i = 0; i < burst; i++) {
        h.send(sockets.Hana, i % 2 === 0
          ? { type: ClientCommandType.SEND_CHAT, message: `hi ${i}` }
          : { type: ClientCommandType.SEND_EMOTE, emoteId: 'wizard' });
      }
      expect(socialFrames(sockets.Pia)).toHaveLength(burst);

      h.drop(sockets.Hana);
      const back = h.join('Hana', 'hana', { sessionToken: token });
      h.send(back, { type: ClientCommandType.SEND_EMOTE, emoteId: 'wizard' });
      expect(refusalOf(back)?.code).toBe(ProtocolErrorCode.RATE_LIMITED);
      expect(socialFrames(sockets.Pia)).toHaveLength(burst);

      // Pia's budget is her own.
      h.send(sockets.Pia, { type: ClientCommandType.SEND_CHAT, message: 'calm down' });
      expect(socialFrames(back).at(-1)).toMatchObject({ message: 'calm down' });

      await h.advance(1_000 / refillPerSecond);
      h.send(back, { type: ClientCommandType.SEND_CHAT, message: 'sorry' });
      h.send(back, { type: ClientCommandType.SEND_CHAT, message: 'sorry again' });
      expect(socialFrames(sockets.Pia).map((frame) => frame.message).slice(-2)).toEqual(['calm down', 'sorry']);
    });
  });

  describe('timeout soundboard', () => {
    interface Soundboard {
      h: RoomHarness;
      /** The player whose turn timer ran out. */
      target: TestConnection;
      sender: TestConnection;
      bystander: TestConnection;
      expire: () => Promise<void>;
    }

    /** Three humans with a bidding timer; nobody moves, so the first decision's timer runs. */
    async function soundboard(): Promise<Soundboard> {
      const t = await startedTable(['Hana', 'Pia', 'Otto'], 0, ruleset({ biddingTimerSeconds: TURN_TIMER_LIMITS.MIN_SECONDS }));
      harnesses.push(t.h);
      const timer = t.h.game.turnTimerState;
      const target = timer ? t.seats.get(timer.playerId) : undefined;
      if (!timer || !target) throw new Error('expected a running turn timer on a human');
      const [sender, bystander] = [...t.seats.values()].filter((socket) => socket !== target);
      const expire = async () => {
        await t.h.advance(timer.expiresAt - Date.now());
        expect(target.ofType(GameEventType.TURN_TIMER_EXPIRED)).toHaveLength(1);
      };
      return { h: t.h, target, sender, bystander, expire };
    }

    const played = (socket: TestConnection) => socket.ofType(GameEventType.TIMEOUT_SOUND_PLAYED);

    const DELIVERED = [
      { label: 'a sound of the library', request: { soundName: JESTER_SOUND_NAMES[0] }, carries: { soundName: JESTER_SOUND_NAMES[0] } },
      { label: 'an upload on the timeout board', request: { customAudio: uploadedSound(true) }, carries: { customAudio: uploadedSound(true) } },
    ];

    it.each(DELIVERED)('delivers $label to the timed-out player and the sender only', async ({ request, carries }) => {
      const { h, target, sender, bystander, expire } = await soundboard();
      await expire();

      h.send(sender, { type: ClientCommandType.PLAY_TIMEOUT_SOUND, ...request });

      const event = { targetPlayerId: h.seatOf(target), senderPlayerId: h.seatOf(sender), ...carries };
      expect(played(target)).toEqual([expect.objectContaining(event)]);
      expect(played(sender)).toEqual([expect.objectContaining(event)]);
      expect(played(bystander)).toHaveLength(0);
    });

    it('opens only once the turn timer ran out', async () => {
      const { h, target, sender, expire } = await soundboard();
      const sound = { type: ClientCommandType.PLAY_TIMEOUT_SOUND, soundName: JESTER_SOUND_NAMES[0] };

      h.send(sender, { ...sound, requestId: 'req-early' });
      expect(refusalOf(sender)?.requestId).toBe('req-early');
      expect(played(target)).toHaveLength(0);

      await expire();
      h.send(sender, sound);
      expect(played(target)).toHaveLength(1);
    });

    const REFUSED = [
      { label: 'an upload its owner kept off the timeout board', from: 'sender', request: { customAudio: uploadedSound(false) } },
      { label: 'a sound the timed-out player aims at themselves', from: 'target', request: { soundName: JESTER_SOUND_NAMES[0] } },
    ] as const;

    it.each(REFUSED)('refuses $label and sends the sound to nobody', async ({ from, request }) => {
      const board = await soundboard();
      await board.expire();
      const socket = board[from];

      board.h.send(socket, { type: ClientCommandType.PLAY_TIMEOUT_SOUND, ...request, requestId: 'req-sound' });

      expect(refusalOf(socket)?.requestId).toBe('req-sound');
      for (const other of [board.target, board.sender, board.bystander]) expect(played(other)).toHaveLength(0);
    });
  });
});
