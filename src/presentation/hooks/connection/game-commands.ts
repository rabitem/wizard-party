import {
  ClientCommandType,
  type ClientPhysicsState,
  type CustomSound,
  type ICardDeclaration,
  type IRoomSettings,
  type IRulesetConfig,
  type SoundPreferences,
  type Suit,
  type TrickEffectResponse,
} from '@shared/domain';
import type { ExternalStore } from '@/presentation/state/external-store';

import type { GameClientState } from './game-client-state';
import type { TrickPresentation } from './trick-presentation';

/** Every command the player can send. Stable for the lifetime of the client. */
export interface GameCommands {
  startGame(): void;
  placeBid(bid: number): void;
  /**
   * Plays a card at once on the client: it leaves the hand and starts its throw while the server
   * decides. One play is in flight at a time; a refusal puts the card back.
   */
  playCard(cardId: string, soundChoice?: string, physicsState?: ClientPhysicsState, customAudio?: CustomSound, declaration?: ICardDeclaration): void;
  /** Null declares no trump (Werewolf holder only). */
  selectTrump(suit: Suit | null): void;
  resolveEffect(response: TrickEffectResponse): void;
  nextRound(): void;
  requestRematch(): void;
  sendEmote(emoteId: string): void;
  sendChat(message: string): void;
  addBot(difficulty?: 1 | 2 | 3 | 4 | 5): void;
  removeBot(botId: string): void;
  setRuleset(rulesetConfig: IRulesetConfig): void;
  setRoomSettings(roomSettings: IRoomSettings): void;
  setReady(ready: boolean): void;
  kickPlayer(playerId: string): void;
  transferHost(playerId: string): void;
  updateSoundPreferences(preferences: SoundPreferences): void;
  playTimeoutSound(sound: string | { soundName?: string; customAudio?: CustomSound }): void;
}

/** What commands go through: the session's outbox. */
export interface CommandSender {
  send(command: { type: string } & Record<string, unknown>): string;
}

export function createGameCommands(
  sender: CommandSender,
  store: ExternalStore<GameClientState>,
  trick: TrickPresentation
): GameCommands {
  const send = (command: { type: ClientCommandType } & Record<string, unknown>) => {
    sender.send(command);
  };
  return {
    startGame: () => send({ type: ClientCommandType.START_GAME }),
    placeBid: (bid) => send({ type: ClientCommandType.PLACE_BID, bid }),
    playCard: (cardId, soundChoice, physicsState, customAudio, declaration) => {
      // A second tap while the first play is undecided would only be refused by the server.
      if (store.getState().pendingPlay) return;
      const requestId = sender.send({ type: ClientCommandType.PLAY_CARD, cardId, soundChoice, physicsState, customAudio, declaration });
      store.update((state) => ({ ...state, pendingPlay: { cardId, requestId } }));
      trick.cardPlayed({ cardId, soundChoice, customAudio, isLocalPlayer: true });
    },
    selectTrump: (suit) => send({ type: ClientCommandType.SELECT_TRUMP, suit }),
    resolveEffect: (response) => send({ type: ClientCommandType.RESOLVE_EFFECT, response }),
    nextRound: () => send({ type: ClientCommandType.NEXT_ROUND }),
    requestRematch: () => send({ type: ClientCommandType.REQUEST_REMATCH }),
    sendEmote: (emoteId) => send({ type: ClientCommandType.SEND_EMOTE, emoteId }),
    sendChat: (message) => send({ type: ClientCommandType.SEND_CHAT, message }),
    addBot: (difficulty) => send({ type: ClientCommandType.ADD_BOT, difficulty }),
    removeBot: (botId) => send({ type: ClientCommandType.REMOVE_BOT, botId }),
    setRuleset: (rulesetConfig) => send({ type: ClientCommandType.SET_RULESET, rulesetConfig }),
    setRoomSettings: (roomSettings) => send({ type: ClientCommandType.SET_ROOM_SETTINGS, roomSettings }),
    setReady: (ready) => send({ type: ClientCommandType.SET_READY, ready }),
    kickPlayer: (playerId) => send({ type: ClientCommandType.KICK_PLAYER, playerId }),
    transferHost: (playerId) => send({ type: ClientCommandType.TRANSFER_HOST, playerId }),
    updateSoundPreferences: (preferences) => send({ type: ClientCommandType.UPDATE_SOUND_PREFERENCES, preferences }),
    playTimeoutSound: (sound) => {
      const payload = typeof sound === 'string' ? { soundName: sound } : sound;
      send({ type: ClientCommandType.PLAY_TIMEOUT_SOUND, ...payload });
    },
  };
}
