import {
  GameEventType,
  isLegacyProtocol,
  toLegacyPause,
  type Game,
  type GameStateEvent,
  type IRoomSettings,
  type SharedCustomSound,
  type SharedSoundsEvent,
} from "../../shared/domain";
import type { TournamentMatchRoomState } from "../../shared/domain/tournament";
import { createPersonalizedState, sharedSoundsSignature } from "../utils/helpers";
import { tournamentMatchPayload } from "../tournament/match-room-view";

export interface GameStateMessageInput {
  game: Game;
  playerId: string;
  roomSettings: IRoomSettings;
  stateVersion: number;
  /** The protocol the receiving connection joined with. */
  protocolVersion: number;
  /** Only read for legacy connections, which still expect the shared sounds in every snapshot. */
  sharedSounds: () => SharedCustomSound[];
  /** The match lock of a tournament room (null in casual rooms), sent beside the state. */
  tournamentMatch?: TournamentMatchRoomState | null;
  now: number;
}

/**
 * One connection's GAME_STATE: its own projection of the game, never anyone else's secrets. A
 * paused game keeps its phase on the wire (protocol 2); legacy clients still expect phase PAUSED.
 */
export function gameStateMessage(input: GameStateMessageInput): GameStateEvent {
  const { game, playerId, roomSettings, stateVersion, protocolVersion, now } = input;
  const state = createPersonalizedState(game, playerId, roomSettings, now);
  return {
    type: GameEventType.GAME_STATE,
    state: isLegacyProtocol(protocolVersion) ? toLegacyPause(state) : state,
    yourPlayerId: playerId,
    stateVersion,
    ...(isLegacyProtocol(protocolVersion) ? { sharedCustomSounds: input.sharedSounds() } : {}),
    ...tournamentMatchPayload(input.tournamentMatch ?? null),
    timestamp: now,
  };
}

export function sharedSoundsMessage(sounds: SharedCustomSound[], now: number): SharedSoundsEvent {
  return { type: GameEventType.SHARED_SOUNDS, sounds, timestamp: now };
}

/** Remembers the last shared sound set the table was sent, so it is resent only on change. */
export class SharedSoundsTracker {
  /** A room starts without shared sounds; joining clients are sent that set when they join. */
  private signature: string = sharedSoundsSignature([]);

  /** Records `sounds` as the current set; true when it differs from the previous one. */
  update(sounds: readonly SharedCustomSound[]): boolean {
    const next = sharedSoundsSignature(sounds);
    if (next === this.signature) return false;
    this.signature = next;
    return true;
  }
}
