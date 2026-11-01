import { z } from 'zod';

import { TELEMETRY_LIMITS, TelemetryEventType, type TelemetryBatch } from './telemetry-event';

/**
 * Runtime validation for the ingest boundary. Envelope fields are validated strictly because they
 * are stored in indexed columns; payloads are only required to be objects so producers can add
 * fields without a coordinated consumer deploy.
 *
 * Kept out of the barrel on purpose: the worker must not bundle zod.
 */

const shortText = z.string().min(1).max(TELEMETRY_LIMITS.MAX_ENVELOPE_TEXT_LENGTH);

export const telemetryEnvelopeSchema = z.object({
  schemaVersion: z.number().int().min(1),
  eventId: z.uuid(),
  type: z.enum(Object.values(TelemetryEventType) as [TelemetryEventType, ...TelemetryEventType[]]),
  occurredAt: z.number().int().positive(),
  roomId: shortText,
  gameId: z.uuid().nullable(),
  seq: z.number().int().nonnegative(),
  source: z.enum(['player', 'bot', 'system']),
  actorId: shortText.nullable(),
  correlationId: shortText,
  commandType: shortText.nullable(),
  round: z.number().int().nonnegative().nullable(),
  phase: shortText,
  serverVersion: shortText.nullable(),
  payload: z.record(z.string(), z.unknown()),
});

export const telemetryBatchSchema = z.object({
  producer: shortText,
  sentAt: z.number().int().positive(),
  events: z.array(telemetryEnvelopeSchema).min(1).max(TELEMETRY_LIMITS.MAX_EVENTS_PER_BATCH),
});

export function parseTelemetryBatch(input: unknown): { ok: true; batch: TelemetryBatch } | { ok: false; error: string } {
  const result = telemetryBatchSchema.safeParse(input);
  if (!result.success) return { ok: false, error: z.prettifyError(result.error) };
  return { ok: true, batch: result.data as TelemetryBatch };
}
