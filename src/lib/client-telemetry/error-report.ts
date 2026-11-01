import { CLIENT_TELEMETRY_LIMITS, type ClientErrorKind, type ClientTelemetryPayloads } from '@shared/telemetry';

export type ClientErrorPayload = ClientTelemetryPayloads['error'];

export interface ClientErrorInput {
  kind: ClientErrorKind;
  /** Error, rejection reason or anything thrown. */
  error?: unknown;
  message?: string | null;
  source?: string | null;
  line?: number | null;
  column?: number | null;
  digest?: string | null;
}

const UNKNOWN_MESSAGE = 'Unknown error';

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

/** Script URLs only: query strings and fragments may carry tokens. */
function sanitizeSource(source: string | null | undefined): string | null {
  if (!source) return null;
  return truncate(source.split(/[?#]/, 1)[0], CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS);
}

function messageOf(input: ClientErrorInput): string {
  if (input.error instanceof Error && input.error.message) return input.error.message;
  if (input.message) return input.message;
  if (typeof input.error === 'string') return input.error;
  return UNKNOWN_MESSAGE;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toClientErrorPayload(input: ClientErrorInput): ClientErrorPayload {
  const error = input.error instanceof Error ? input.error : null;
  return {
    kind: input.kind,
    message: truncate(messageOf(input), CLIENT_TELEMETRY_LIMITS.MAX_ERROR_MESSAGE_CHARS) ?? UNKNOWN_MESSAGE,
    name: truncate(error?.name, CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS),
    source: sanitizeSource(input.source),
    line: finiteOrNull(input.line),
    column: finiteOrNull(input.column),
    stack: truncate(error?.stack, CLIENT_TELEMETRY_LIMITS.MAX_STACK_CHARS),
    digest: truncate(input.digest, CLIENT_TELEMETRY_LIMITS.MAX_TEXT_CHARS),
  };
}

/**
 * Suppresses repeats of the same error within a tab session (render loops can throw every frame)
 * and caps the number of distinct errors, so a broken page cannot flood the pipeline.
 */
export class ErrorDeduper {
  private readonly seen = new Set<string>();

  constructor(private readonly maxDistinct: number) {}

  /** True when the error is new and should be reported. */
  admit(payload: ClientErrorPayload): boolean {
    const fingerprint = [payload.kind, payload.name, payload.message, payload.source, payload.line, payload.column].join('|');
    if (this.seen.has(fingerprint) || this.seen.size >= this.maxDistinct) return false;
    this.seen.add(fingerprint);
    return true;
  }
}
