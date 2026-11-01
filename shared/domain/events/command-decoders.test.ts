import { describe, expect, it } from 'vitest';

import { Suit } from '../value-objects/card-types';
import { ClientCommandType } from './client-commands';
import { decodeClientCommand, isClientCommandType } from './command-decoders';
import { COMMAND_LIMITS, FRAME_LIMITS, MAX_FRAME_LENGTH, maxFrameLengthFor } from './command-limits';
import { ProtocolErrorCode } from './protocol';

function decode(value: unknown) {
  return decodeClientCommand(value, JSON.stringify(value ?? null).length);
}

function expectRefused(value: unknown, code: string = ProtocolErrorCode.INVALID_COMMAND) {
  const result = decode(value);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe(code);
  return result;
}

describe('decodeClientCommand', () => {
  describe('envelope', () => {
    it('refuses anything that is not a JSON object with a string type', () => {
      expectRefused(null);
      expectRefused([ClientCommandType.START_GAME]);
      expectRefused('START_GAME');
      expectRefused({ type: 7 });
    });

    it('refuses unknown types without telling the client, keeping type and requestId for telemetry', () => {
      const result = expectRefused({ type: 'TELEPORT', requestId: 'req-1' }, 'UNKNOWN_COMMAND');
      if (!result.ok) {
        expect(result.commandType).toBe('TELEPORT');
        expect(result.requestId).toBe('req-1');
      }
    });

    it.each(['MUTE_PLAYER', 'UNMUTE_PLAYER'])('refuses the retired %s as an unknown type', (type) => {
      expectRefused({ type, targetPlayerId: 'p_bob', requestId: 'req-mute' }, 'UNKNOWN_COMMAND');
    });

    it('keeps the requestId of a refused command so the error can be correlated', () => {
      const result = expectRefused({ type: ClientCommandType.PLACE_BID, bid: 'one', requestId: 'req-bid' });
      if (!result.ok) expect(result.requestId).toBe('req-bid');
    });

    it('reads an empty requestId as none and refuses an oversized or non-text one', () => {
      expect(decode({ type: ClientCommandType.START_GAME, requestId: '' })).toEqual({
        ok: true,
        command: { type: ClientCommandType.START_GAME },
      });
      expectRefused({ type: ClientCommandType.START_GAME, requestId: 42 });
      expectRefused({ type: ClientCommandType.START_GAME, requestId: 'r'.repeat(COMMAND_LIMITS.MAX_REQUEST_ID_LENGTH + 1) });
    });

    it('copies only the fields the command defines', () => {
      expect(decode({ type: ClientCommandType.START_GAME, requestId: 'req', state: { hands: [] } })).toEqual({
        ok: true,
        command: { type: ClientCommandType.START_GAME, requestId: 'req' },
      });
    });

    it('refuses a frame larger than its command type allows', () => {
      const result = decodeClientCommand({ type: ClientCommandType.SEND_EMOTE, emoteId: 'wizard' }, FRAME_LIMITS.DEFAULT + 1);
      expect(result).toMatchObject({ ok: false, code: ProtocolErrorCode.PAYLOAD_TOO_LARGE });
    });

    it('allows sound uploads larger frames than plain commands, bounded by the overall maximum', () => {
      expect(maxFrameLengthFor(ClientCommandType.UPDATE_SOUND_PREFERENCES)).toBeGreaterThan(FRAME_LIMITS.DEFAULT);
      expect(maxFrameLengthFor(ClientCommandType.PLACE_BID)).toBe(FRAME_LIMITS.DEFAULT);
      expect(MAX_FRAME_LENGTH).toBe(maxFrameLengthFor(ClientCommandType.UPDATE_SOUND_PREFERENCES));
    });

    it('recognizes every command type', () => {
      for (const type of Object.values(ClientCommandType)) expect(isClientCommandType(type)).toBe(true);
      expect(isClientCommandType('TELEPORT')).toBe(false);
    });
  });

  describe('bids', () => {
    it.each([null, '1', 0.5, [1], true, -1, COMMAND_LIMITS.MAX_BID + 1, Number.NaN])('refuses the bid %j', (bid) => {
      expectRefused({ type: ClientCommandType.PLACE_BID, bid });
    });

    it('refuses a missing bid', () => {
      expectRefused({ type: ClientCommandType.PLACE_BID });
    });

    it('accepts whole-number bids in range', () => {
      expect(decode({ type: ClientCommandType.PLACE_BID, bid: 3, requestId: 'r' })).toEqual({
        ok: true,
        command: { type: ClientCommandType.PLACE_BID, bid: 3, requestId: 'r' },
      });
    });
  });

  describe('trump', () => {
    it.each(['BANANAS', 7, 'giants'])('refuses the suit %j', (suit) => {
      expectRefused({ type: ClientCommandType.SELECT_TRUMP, suit });
    });

    it('accepts a suit, and null or no suit as "no trump"', () => {
      expect(decode({ type: ClientCommandType.SELECT_TRUMP, suit: Suit.ELVES })).toMatchObject({ ok: true, command: { suit: Suit.ELVES } });
      expect(decode({ type: ClientCommandType.SELECT_TRUMP, suit: null })).toMatchObject({ ok: true, command: { suit: null } });
      expect(decode({ type: ClientCommandType.SELECT_TRUMP })).toMatchObject({ ok: true, command: { suit: null } });
    });
  });

  describe('social', () => {
    it('refuses emotes that are not catalogue ids', () => {
      expectRefused({ type: ClientCommandType.SEND_EMOTE, emoteId: { blob: 'x'.repeat(1000) } });
      expectRefused({ type: ClientCommandType.SEND_EMOTE, emoteId: '<img src=x>' });
      expectRefused({ type: ClientCommandType.SEND_EMOTE, emoteId: 'e'.repeat(33) });
      expect(decode({ type: ClientCommandType.SEND_EMOTE, emoteId: 'thumbs_up' }).ok).toBe(true);
    });

    it('refuses chat that is not text or far too long', () => {
      expectRefused({ type: ClientCommandType.SEND_CHAT, message: 42 });
      expectRefused({ type: ClientCommandType.SEND_CHAT, message: 'm'.repeat(COMMAND_LIMITS.MAX_CHAT_INPUT_LENGTH + 1) });
      expect(decode({ type: ClientCommandType.SEND_CHAT, message: 'good luck' }).ok).toBe(true);
    });
  });

  describe('bots and lobby', () => {
    it('accepts only the known bot difficulty levels', () => {
      expect(decode({ type: ClientCommandType.ADD_BOT })).toEqual({ ok: true, command: { type: ClientCommandType.ADD_BOT } });
      expect(decode({ type: ClientCommandType.ADD_BOT, difficulty: 5 })).toMatchObject({ ok: true, command: { difficulty: 5 } });
      expectRefused({ type: ClientCommandType.ADD_BOT, difficulty: 6 });
      expectRefused({ type: ClientCommandType.ADD_BOT, difficulty: '3' });
    });

    it('requires a boolean ready flag and a player id to kick', () => {
      expectRefused({ type: ClientCommandType.SET_READY, ready: 'yes' });
      expectRefused({ type: ClientCommandType.KICK_PLAYER, playerId: '' });
      expect(decode({ type: ClientCommandType.SET_READY, ready: true }).ok).toBe(true);
    });

    it('requires an object for room settings and rulesets (normalized by the domain)', () => {
      expectRefused({ type: ClientCommandType.SET_RULESET, rulesetConfig: 'strict' });
      expectRefused({ type: ClientCommandType.SET_ROOM_SETTINGS, roomSettings: [] });
      expect(decode({ type: ClientCommandType.SET_RULESET, rulesetConfig: {} }).ok).toBe(true);
    });
  });

  describe('join', () => {
    it('reads the session token and protocol version', () => {
      const token = 'a'.repeat(43);
      expect(decode({
        type: ClientCommandType.JOIN_GAME,
        playerName: 'Alice',
        persistentId: 'player-1700000000000-alice01',
        sessionToken: token,
        protocolVersion: 2,
      })).toEqual({
        ok: true,
        command: {
          type: ClientCommandType.JOIN_GAME,
          playerName: 'Alice',
          persistentId: 'player-1700000000000-alice01',
          sessionToken: token,
          protocolVersion: 2,
        },
      });
    });

    it('accepts a legacy join without token or version', () => {
      expect(decode({ type: ClientCommandType.JOIN_GAME, playerName: 'Bob', persistentId: 'player-1700000000000-bob2222' }).ok).toBe(true);
    });

    it('keeps the tournament and character tickets next to the session token', () => {
      const result = decode({
        type: ClientCommandType.JOIN_GAME,
        playerName: 'Merlin',
        persistentId: 'player-1700000000000-merlin1',
        protocolVersion: 2,
        tournamentTicket: 'v1.payload.signature',
        appearanceTicket: 'c1.payload.signature',
      });

      expect(result.ok && result.command).toMatchObject({ tournamentTicket: 'v1.payload.signature', appearanceTicket: 'c1.payload.signature', protocolVersion: 2 });
    });

    it('refuses a ticket that is not text or far too long', () => {
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', tournamentTicket: { forged: true } });
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', tournamentTicket: 'v'.repeat(17 * 1024) });
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', appearanceTicket: { forged: true } });
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', appearanceTicket: 'c'.repeat(3 * 1024) });
    });

    it('refuses a malformed token, version or name', () => {
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', sessionToken: 12 });
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: 'Eve', protocolVersion: 1.5 });
      expectRefused({ type: ClientCommandType.JOIN_GAME, playerName: { name: 'Eve' } });
    });
  });

  describe('cards and effects', () => {
    const vector = { x: 1, y: 2, z: 3 };

    it('accepts a card with a well-formed throw', () => {
      const result = decode({
        type: ClientCommandType.PLAY_CARD,
        cardId: 'GIANTS-13',
        physicsState: { throwVelocity: vector, landingPosition: vector, startPosition: vector },
      });
      expect(result).toMatchObject({ ok: true, command: { cardId: 'GIANTS-13', physicsState: { startPosition: vector } } });
    });

    it('refuses a card id that is missing or not text', () => {
      expectRefused({ type: ClientCommandType.PLAY_CARD });
      expectRefused({ type: ClientCommandType.PLAY_CARD, cardId: 13 });
    });

    it('plays the card without its throw when the throw is unusable (it only animates the card)', () => {
      // JSON turns a NaN velocity into null; a glitchy drag must not cost the player the move.
      for (const throwVelocity of [{ x: 'fast', y: 0, z: 0 }, { x: null, y: 0, z: 0 }, { x: 1e9, y: 0, z: 0 }]) {
        expect(decode({
          type: ClientCommandType.PLAY_CARD,
          cardId: 'GIANTS-13',
          physicsState: { throwVelocity, landingPosition: vector, startPosition: vector },
        })).toEqual({ ok: true, command: { type: ClientCommandType.PLAY_CARD, cardId: 'GIANTS-13' } });
      }
      expect(decode({ type: ClientCommandType.PLAY_CARD, cardId: 'GIANTS-13', physicsState: 'fast' }))
        .toEqual({ ok: true, command: { type: ClientCommandType.PLAY_CARD, cardId: 'GIANTS-13' } });
    });

    it('accepts only well-formed effect responses', () => {
      expect(decode({ type: ClientCommandType.RESOLVE_EFFECT, response: { kind: 'ADJUST_BID', delta: 1 } }).ok).toBe(true);
      expectRefused({ type: ClientCommandType.RESOLVE_EFFECT, response: { kind: 'ADJUST_BID', delta: 2 } });
      expectRefused({ type: ClientCommandType.RESOLVE_EFFECT });
    });
  });
});
