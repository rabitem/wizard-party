import { ClientCommandType, PROTOCOL_VERSION } from '@shared/domain';
import type { RoomSettings } from '@/presentation/types';

export const SOCKET_OPEN = 1;

interface SendableSocket {
  readyState: number;
  send(message: string): void;
}

interface CommandWithRequestId {
  requestId?: string;
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function withRequestId<T extends object>(command: T): T & { requestId: string } {
  const requestId = (command as CommandWithRequestId).requestId;
  if (requestId) return command as T & { requestId: string };

  return {
    ...command,
    requestId: createRequestId(),
  };
}

export function sendSocketCommand(socket: SendableSocket | null | undefined, command: object): boolean {
  if (!socket || socket.readyState !== SOCKET_OPEN) return false;
  try {
    socket.send(JSON.stringify(withRequestId(command)));
    return true;
  } catch (error) {
    console.warn('[Connection] Socket send failed; command will be retried if queued', error);
    return false;
  }
}

export interface JoinSeat {
  persistentId: string;
  /** The seat's secret from an earlier SESSION in this room, if any. */
  sessionToken: string | undefined;
  /** Room-specific fields, e.g. a tournament table's ticket (sent with every (re)join). */
  extraFields: Record<string, unknown>;
}

/**
 * The JOIN_GAME frame a (re)connecting client sends first on every socket. It carries no
 * requestId: the server answers with SESSION and GAME_STATE (or an ERROR).
 */
export function joinGameFrame(
  room: { playerName: string; roomSettings?: RoomSettings },
  { persistentId, sessionToken, extraFields }: JoinSeat
): Record<string, unknown> {
  return {
    type: ClientCommandType.JOIN_GAME,
    playerName: room.playerName,
    persistentId,
    sessionToken,
    protocolVersion: PROTOCOL_VERSION,
    roomSettings: room.roomSettings,
    ...extraFields,
  };
}
