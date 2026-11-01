import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULESET_CONFIG,
  GameAlreadyStartedError,
  MaxPlayersReachedError,
  PlayerKickedError,
  Player,
  PlayerNameTakenError,
  ROOM_PLAYER_LIMITS,
  RoomFullError,
} from '@shared/domain';
import { DEFAULT_APPEARANCE, botAppearance } from '@shared/domain/character';
import { buildSeatViews, startReadiness, summarizeRules } from './lobby-view';
import { classifyLobbyError } from './LobbyStates';
import type { LobbySeatView } from './lobby-view.types';

function seat(overrides: Partial<LobbySeatView>): LobbySeatView {
  return { id: 'x', name: 'X', appearance: null, isHost: false, isLocal: false, isBot: false, isReady: false, isConnected: true, graceEndsAt: null, hasAccount: false, isGuest: false, ...overrides };
}

describe('summarizeRules', () => {
  it('should show classic chips without house rules for the default ruleset', () => {
    const chips = summarizeRules(DEFAULT_RULESET_CONFIG);
    expect(chips.map((chip) => chip.label)).toEqual(['Full game', 'Classic scoring']);
    expect(chips.some((chip) => chip.isHouseRule)).toBe(false);
  });

  it('should flag changed rules as house rules', () => {
    const chips = summarizeRules({
      ...DEFAULT_RULESET_CONFIG,
      bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true },
      turn: { ...DEFAULT_RULESET_CONFIG.turn, playTimerSeconds: 60 },
    });
    expect(chips.find((chip) => chip.id === 'hidden')?.isHouseRule).toBe(true);
    expect(chips.find((chip) => chip.id === 'timer')?.label).toBe('60 s turns');
  });

  it('should count a single custom round in the singular', () => {
    const chips = summarizeRules({ ...DEFAULT_RULESET_CONFIG, structure: { ...DEFAULT_RULESET_CONFIG.structure, customRoundCount: 1 } });
    expect(chips.find((chip) => chip.id === 'rounds')?.label).toBe('1 round');
  });
});

describe('startReadiness', () => {
  it('should block the start below the minimum player count', () => {
    const result = startReadiness([seat({ isHost: true }), seat({ id: 'b', name: 'B' })], 'X', true);
    expect(result.canStart).toBe(false);
    expect(result.reason).toContain('1 more player');
  });

  it('should name unready players for the host but still allow the start', () => {
    const seats = [seat({ isHost: true, isReady: true }), seat({ id: 'b', name: 'Bea' }), seat({ id: 'c', name: 'Cy', isReady: true })];
    const result = startReadiness(seats, 'X', true);
    expect(result.canStart).toBe(true);
    expect(result.reason).toContain('Bea not ready');
  });

  it('should mention a reconnecting player first', () => {
    const seats = [seat({ isHost: true }), seat({ id: 'b', name: 'Bea', isConnected: false }), seat({ id: 'c', name: 'Cy', isReady: true })];
    expect(startReadiness(seats, 'X', true).reason).toContain('Waiting for Bea to reconnect');
  });
});

describe('buildSeatViews', () => {
  const players = [new Player('me', 'Me'), new Player('other', 'Other')];
  const build = (localIsGuest: boolean) => buildSeatViews({
    players, hostId: 'me', localPlayerId: 'me', localAppearance: localIsGuest ? null : DEFAULT_APPEARANCE, localIsGuest,
    accounts: new Map(), graceEndsAt: new Map(),
  });

  it('should show the local look, room and account looks and bot looks, and a silhouette for anyone unknown', () => {
    const friendLook = { ...DEFAULT_APPEARANCE, palette: 'palette:frost' };
    const ticketLook = { ...DEFAULT_APPEARANCE, palette: 'palette:ember' };
    const signedIn = new Player('signed', 'Signed');
    signedIn.appearance = ticketLook;
    const seats = buildSeatViews({
      players: [new Player('me', 'Me'), new Player('friend', 'Friend'), new Player('bot', 'Bot', true, 5), new Player('stranger', 'Stranger'), signedIn],
      hostId: 'me', localPlayerId: 'me', localAppearance: DEFAULT_APPEARANCE, localIsGuest: false,
      accounts: new Map([['friend', { appearance: friendLook, level: 4 }]]), graceEndsAt: new Map(),
    });
    expect(seats.map((seat) => seat.appearance)).toEqual([DEFAULT_APPEARANCE, friendLook, botAppearance(5), null, ticketLook]);
  });

  it('should mark only the local seat as a guest, never a seat whose account is merely unknown', () => {
    expect(build(true).map((view) => [view.id, view.isGuest])).toEqual([['me', true], ['other', false]]);
    expect(build(false).every((view) => !view.isGuest)).toBe(true);
  });
});

describe('classifyLobbyError', () => {
  it.each([
    { refusal: 'kicked by the host', message: PlayerKickedError.MESSAGE, kind: 'kicked' },
    { refusal: 'room full', message: new RoomFullError().message, kind: 'full' },
    { refusal: 'smallest room full', message: new MaxPlayersReachedError(ROOM_PLAYER_LIMITS.MIN).message, kind: 'full' },
    { refusal: 'largest room full', message: new MaxPlayersReachedError(ROOM_PLAYER_LIMITS.MAX).message, kind: 'full' },
    { refusal: 'game started', message: new GameAlreadyStartedError().message, kind: 'started' },
  ] as const)('should show the dedicated screen when the server refuses the join: $refusal', ({ message, kind }) => {
    expect(classifyLobbyError(message)).toBe(kind);
  });

  // Regression: substring matching sent a player whose name was taken to "This table is full"
  // (or another dead end) when the quoted name contained "full", "ended", "closed" or "not found".
  it.each(['Mindful', 'Ended', 'Closed', 'Not Found', 'Maximum', 'In Progress'])(
    'should keep a taken name like %s on the join form',
    (name) => {
      expect(classifyLobbyError(new PlayerNameTakenError(name).message)).toBe('generic');
    },
  );

  it('should keep unknown refusals on the join form', () => {
    expect(classifyLobbyError('Failed to create connection')).toBe('generic');
  });
});
