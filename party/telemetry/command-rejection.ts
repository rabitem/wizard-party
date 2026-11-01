import { GameError } from '../../shared/domain';
import {
  TELEMETRY_PAYLOAD_LIMITS,
  TelemetryEventType,
  boundedText,
  type CommandRejectionCode,
} from '../../shared/telemetry';
import { telemetryFact, type TelemetryFact } from './telemetry-fact';

/** Why the server refused or failed a client command, independent of how the client is told. */
export interface CommandRejection {
  errorCode: string | null;
  errorName: string;
  message: string;
}

/** The command a rejection belongs to; fields are client-controlled and therefore untrusted. */
export interface RejectedCommandRef {
  commandType: unknown;
  requestId: unknown;
}

const UNEXPECTED_ERROR_NAME = 'UnknownError';

export function rejectionFromError(error: unknown): CommandRejection {
  if (error instanceof GameError) {
    return { errorCode: error.code, errorName: error.name, message: error.message };
  }
  if (error instanceof Error) {
    return { errorCode: null, errorName: error.name, message: error.message };
  }
  return { errorCode: null, errorName: UNEXPECTED_ERROR_NAME, message: String(error) };
}

export function rejectionWithCode(code: CommandRejectionCode, message: string): CommandRejection {
  return { errorCode: code, errorName: 'CommandRejection', message };
}

export function commandRejectedFact(
  command: RejectedCommandRef | null,
  rejection: CommandRejection,
  notifiedClient: boolean
): TelemetryFact<typeof TelemetryEventType.COMMAND_REJECTED> {
  const { MAX_SHORT_TEXT_LENGTH, MAX_ERROR_MESSAGE_LENGTH } = TELEMETRY_PAYLOAD_LIMITS;
  return telemetryFact(TelemetryEventType.COMMAND_REJECTED, null, {
    commandType: boundedText(command?.commandType, MAX_SHORT_TEXT_LENGTH),
    requestId: boundedText(command?.requestId, MAX_SHORT_TEXT_LENGTH),
    errorCode: boundedText(rejection.errorCode, MAX_SHORT_TEXT_LENGTH),
    errorName: boundedText(rejection.errorName, MAX_SHORT_TEXT_LENGTH) ?? UNEXPECTED_ERROR_NAME,
    message: boundedText(rejection.message, MAX_ERROR_MESSAGE_LENGTH) ?? '',
    notifiedClient,
  });
}
