import { describe, expect, it } from 'vitest';
import { DEFAULT_RULESET_CONFIG, Game, GameEventType, GamePhase, Player, type IGameState } from '@shared/domain';
import type { LobbyActivityEntry } from '@/presentation/types';
import { activityFromEvent, activityFromStateChange, appendLobbyActivity } from './lobby-activity';

const AT = 1_700_000_000_000;

function lobbyState(): IGameState {
  const game = new Game('activity-room', 'host');
  game.addPlayer(new Player('host', 'Alice'));
  game.addPlayer(new Player('guest', 'Bob'));
  return {
    ...game.toJSON(),
    roomSettings: { name: 'Room', isPublic: false, maxPlayers: 6 },
  };
}

describe('lobby-activity', () => {
  describe('activityFromEvent', () => {
    it('should describe joins, leaves, removals and host changes with player names', () => {
      const state = lobbyState();

      expect(activityFromEvent({ type: GameEventType.PLAYER_JOINED, playerId: 'new', playerName: 'Clara' }, state, 'host', AT))
        .toEqual({ kind: 'joined', playerName: 'Clara', at: AT });
      expect(activityFromEvent({ type: GameEventType.PLAYER_LEFT, playerId: 'guest' }, state, 'host', AT))
        .toEqual({ kind: 'left', playerName: 'Bob', at: AT });
      expect(activityFromEvent({ type: GameEventType.PLAYER_KICKED, playerId: 'guest' }, state, 'host', AT))
        .toEqual({ kind: 'kicked', playerName: 'Bob', at: AT });
      expect(activityFromEvent({ type: GameEventType.HOST_CHANGED, hostId: 'guest' }, state, 'host', AT))
        .toEqual({ kind: 'host', playerName: 'Bob', at: AT });
    });

    it('should ignore the local join, other events and anything outside the lobby', () => {
      const state = lobbyState();

      expect(activityFromEvent({ type: GameEventType.PLAYER_JOINED, playerId: 'host', playerName: 'Alice' }, state, 'host', AT)).toBeNull();
      expect(activityFromEvent({ type: GameEventType.EMOTE, playerId: 'guest' }, state, 'host', AT)).toBeNull();
      expect(activityFromEvent({ type: GameEventType.PLAYER_LEFT, playerId: 'guest' }, { ...state, phase: GamePhase.PLAYING }, 'host', AT)).toBeNull();
      expect(activityFromEvent({ type: GameEventType.PLAYER_LEFT, playerId: 'guest' }, null, 'host', AT)).toBeNull();
    });
  });

  describe('activityFromStateChange', () => {
    it('should report ruleset and room settings changes credited to the host', () => {
      const previous = lobbyState();
      const next: IGameState = {
        ...previous,
        rulesetConfig: { ...DEFAULT_RULESET_CONFIG, bidding: { ...DEFAULT_RULESET_CONFIG.bidding, hiddenBids: true } },
        roomSettings: { name: 'Room', isPublic: true, maxPlayers: 6 },
      };

      expect(activityFromStateChange(previous, next, AT)).toEqual([
        { kind: 'rules', playerName: 'Alice', at: AT },
        { kind: 'settings', playerName: 'Alice', at: AT },
      ]);
    });

    it('should report nothing for unchanged states, other rooms or non-lobby phases', () => {
      const previous = lobbyState();

      expect(activityFromStateChange(previous, { ...previous }, AT)).toEqual([]);
      expect(activityFromStateChange(null, previous, AT)).toEqual([]);
      expect(activityFromStateChange({ ...previous, id: 'other', roomSettings: undefined }, previous, AT)).toEqual([]);
      expect(activityFromStateChange(previous, { ...previous, phase: GamePhase.BIDDING, roomSettings: undefined }, AT)).toEqual([]);
    });
  });

  describe('appendLobbyActivity', () => {
    it('should keep only the newest entries', () => {
      const entry = (n: number): LobbyActivityEntry => ({ id: `e${n}`, kind: 'joined', at: n });
      const feed = [entry(1), entry(2), entry(3)];

      expect(appendLobbyActivity(feed, [entry(4), entry(5)], 4).map((e) => e.id)).toEqual(['e2', 'e3', 'e4', 'e5']);
      expect(appendLobbyActivity(feed, [], 4)).toBe(feed);
    });
  });
});
