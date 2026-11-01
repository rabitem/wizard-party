import type { GameTraceEntry, GameTraceSeverity } from './game-trace';

const VALID_SEVERITIES = new Set<GameTraceSeverity>(['debug', 'info', 'warn', 'error']);
const MAX_STRING_LENGTH = 160;
const MAX_DETAIL_KEYS = 20;

type SanitizedGameTracePayload = Partial<GameTraceEntry> & {
  type: string;
  severity: GameTraceSeverity;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function sanitizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  return value.slice(0, MAX_STRING_LENGTH);
}

function sanitizeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function sanitizeSeverity(value: unknown): GameTraceSeverity {
  return typeof value === 'string' && VALID_SEVERITIES.has(value as GameTraceSeverity)
    ? value as GameTraceSeverity
    : 'info';
}

function sanitizeDetails(value: unknown): Record<string, unknown> | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_DETAIL_KEYS)
      .map(([key, detail]) => {
        if (typeof detail === 'string') return [key, detail.slice(0, MAX_STRING_LENGTH)];
        if (typeof detail === 'number' && Number.isFinite(detail)) return [key, detail];
        if (typeof detail === 'boolean') return [key, detail];
        if (detail === null) return [key, null];
        return [key, String(detail).slice(0, MAX_STRING_LENGTH)];
      })
  );
}

export function sanitizeGameTracePayload(payload: unknown): SanitizedGameTracePayload | null {
  const record = asRecord(payload);
  if (!record) return null;

  const type = sanitizeString(record.type);
  if (!type) return null;

  return {
    type,
    severity: sanitizeSeverity(record.severity),
    roomId: sanitizeString(record.roomId),
    playerId: sanitizeString(record.playerId),
    eventType: sanitizeString(record.eventType),
    commandType: sanitizeString(record.commandType),
    cardId: sanitizeString(record.cardId),
    requestId: sanitizeString(record.requestId),
    serverTimestamp: sanitizeNumber(record.serverTimestamp),
    clientTimestamp: sanitizeNumber(record.clientTimestamp),
    traceSessionId: sanitizeString(record.traceSessionId),
    lagMs: sanitizeNumber(record.lagMs),
    replayedCardCount: sanitizeNumber(record.replayedCardCount),
    reason: sanitizeString(record.reason),
    visibilityState: sanitizeString(record.visibilityState),
    online: sanitizeBoolean(record.online),
    details: sanitizeDetails(record.details),
  };
}
