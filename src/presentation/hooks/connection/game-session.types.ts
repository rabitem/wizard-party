import type { IGameState } from '@shared/domain';
import type { GameTraceEvent } from '@/lib/game-trace';
import type { ConnectionStatus, RoomSettings } from '@/presentation/types';

import type { CommandOutcome, OutboxEntry } from './command-outbox';
import type { ConnectionTelemetry } from './connection-telemetry';
import type { GameSocketFactory } from './game-socket';
import type { WireEvent } from './session-trace';

export interface ConnectParams {
  host: string;
  roomId: string;
  playerName: string;
  roomSettings?: RoomSettings;
}

/** Where the seat's session token is kept per room. */
export interface SeatTokenStore {
  load(roomId: string): string | undefined;
  save(roomId: string, token: string): void;
  forget(roomId: string): void;
}

export interface SessionError {
  message: string;
  code?: string;
}

/** What the session tells the client state (React adapters, stores) about. */
export interface GameSessionListener {
  onStatus(status: ConnectionStatus): void;
  /** Every game message the session does not consume itself, in arrival order. */
  onEvent(event: WireEvent, meta: { receivedAt: number; lagMs?: number }): void;
  onCommandSettled(entry: OutboxEntry, outcome: CommandOutcome, error?: SessionError): void;
  /** A connection problem worth telling the player about. */
  onNotice(message: string): void;
  /** A connect() to a different room than before: room-scoped client state starts over. */
  onRoomChanged(): void;
  /** Extra JOIN_GAME fields for a room (a tournament ticket). */
  joinFields(roomId: string): Record<string, unknown>;
  /** The game state as applied, for traces only. */
  currentState(): IGameState | null;
}

export interface GameSessionDeps {
  socketFactory: GameSocketFactory;
  seatTokens: SeatTokenStore;
  telemetry: ConnectionTelemetry;
  persistentId: () => string;
  appVersion: () => string;
  trace?: (event: GameTraceEvent) => void;
  /** A number in [0, 1) for the reconnect jitter; Math.random when left out, seeded in tests. */
  random?: () => number;
}

export const SILENT_SESSION_LISTENER: GameSessionListener = {
  onStatus: () => {},
  onEvent: () => {},
  onCommandSettled: () => {},
  onNotice: () => {},
  onRoomChanged: () => {},
  joinFields: () => ({}),
  currentState: () => null,
};
