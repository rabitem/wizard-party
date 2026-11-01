import {
  MAX_FRAME_LENGTH,
  ProtocolErrorCode,
  decodeClientCommand,
  type ClientCommand,
  type CommandDecodeFailureCode,
} from "../../shared/domain";
import { CommandRejectionCode } from "../../shared/telemetry";
import { rejectionWithCode, type CommandRejection } from "../telemetry";

/** What the client is told about a frame that was not valid JSON (the parser's text stays server-side). */
const MALFORMED_MESSAGE = 'Malformed message';

/** A refused frame: why (for telemetry and the client) and which command it claimed to be. */
export interface RefusedClientCommand {
  ok: false;
  rejection: CommandRejection;
  /** The text the client is shown (the rejection's message may hold parser internals). */
  clientMessage: string;
  /** The `type` the frame claimed, when it was text. */
  commandType: string | null;
  /** The frame's requestId when it was valid, so the ERROR can be correlated with it. */
  requestId: string | null;
  /** Unknown command types are refused silently (a newer client may probe for features). */
  notifyClient: boolean;
}

export type ParsedClientCommand = { ok: true; command: ClientCommand } | RefusedClientCommand;

const REJECTION_CODE: Record<CommandDecodeFailureCode, CommandRejectionCode> = {
  [ProtocolErrorCode.INVALID_COMMAND]: CommandRejectionCode.INVALID_COMMAND,
  [ProtocolErrorCode.PAYLOAD_TOO_LARGE]: CommandRejectionCode.PAYLOAD_TOO_LARGE,
  UNKNOWN_COMMAND: CommandRejectionCode.UNKNOWN_COMMAND,
};

function refused(
  code: CommandRejectionCode,
  message: string,
  details: Partial<Pick<RefusedClientCommand, 'clientMessage' | 'commandType' | 'requestId' | 'notifyClient'>> = {}
): RefusedClientCommand {
  return {
    ok: false,
    rejection: rejectionWithCode(code, message),
    clientMessage: details.clientMessage ?? message,
    commandType: details.commandType ?? null,
    requestId: details.requestId ?? null,
    notifyClient: details.notifyClient ?? true,
  };
}

/**
 * Parses and decodes one raw WebSocket message into a typed command. Every field of every command
 * is checked here (see decodeClientCommand), so handlers and use cases only ever see well-typed
 * values within bounds.
 */
export function parseClientCommand(message: string): ParsedClientCommand {
  if (message.length > MAX_FRAME_LENGTH) {
    return refused(CommandRejectionCode.PAYLOAD_TOO_LARGE, 'Message is too large');
  }

  let value: unknown;
  try {
    value = JSON.parse(message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Malformed JSON';
    return refused(CommandRejectionCode.INVALID_JSON, reason, { clientMessage: MALFORMED_MESSAGE });
  }

  const decoded = decodeClientCommand(value, message.length);
  if (decoded.ok) return decoded;
  return refused(REJECTION_CODE[decoded.code], decoded.message, {
    commandType: decoded.commandType,
    requestId: decoded.requestId,
    notifyClient: decoded.code !== 'UNKNOWN_COMMAND',
  });
}
