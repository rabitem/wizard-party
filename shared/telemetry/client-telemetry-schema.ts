import { z } from 'zod';

import {
  CLIENT_TELEMETRY_LIMITS,
  ClientTelemetryEventType,
  type AnyClientTelemetryEnvelope,
} from './client-telemetry';

/**
 * Runtime validation for the public client ingest boundary. Envelope fields are validated strictly
 * because they are stored in indexed columns; payloads only have to be bounded objects, except for
 * types whose payload feeds typed read-model columns (PAYLOAD_SCHEMAS).
 *
 * Batches are validated leniently: a malformed event is dropped on its own instead of failing the
 * whole beacon, because the browser never retries.
 *
 * Kept out of the barrel on purpose: neither the worker nor the browser bundle should pull in zod.
 */

const L = CLIENT_TELEMETRY_LIMITS;
const EVENT_TYPES = Object.values(ClientTelemetryEventType) as [ClientTelemetryEventType, ...ClientTelemetryEventType[]];

const id = z.string().min(1).max(L.MAX_ID_CHARS);

const payloadSchema = z
  .record(z.string(), z.unknown())
  .refine((payload) => JSON.stringify(payload).length <= L.MAX_EVENT_BYTES, 'payload too large');

/** Plausibility bounds for device profile numbers; they also keep values inside the column types. */
export const DEVICE_PROFILE_BOUNDS = {
  MAX_SCREEN_PX: 100_000,
  MAX_DEVICE_PIXEL_RATIO: 16,
  /** client_sessions.cpu_cores is a smallint. */
  MAX_CPU_CORES: 1_024,
  MAX_DEVICE_MEMORY_GB: 1_024,
  MAX_TOUCH_POINTS: 256,
  MAX_CONNECTION_RTT_MS: 600_000,
  MAX_DOWNLINK_MBPS: 100_000,
  MAX_BRANDS: 16,
  MAX_LANGUAGES: 32,
} as const;

const B = DEVICE_PROFILE_BOUNDS;
const text = (max: number = L.MAX_TEXT_CHARS) => z.string().max(max).nullish();
const integer = (max: number) => z.number().int().min(0).max(max).nullish();
const decimal = (max: number) => z.number().min(0).max(max).nullish();
const flag = z.boolean().nullish();

/**
 * session.started feeds typed client_sessions columns, so its known fields are validated by type
 * and range. Fields are optional (older producers) and unknown fields pass through (newer ones).
 */
export const deviceProfileSchema = z.looseObject({
  userAgent: text(L.MAX_USER_AGENT_CHARS),
  uaBrands: z
    .array(z.object({ brand: z.string().max(L.MAX_TEXT_CHARS), version: z.string().max(L.MAX_TEXT_CHARS) }))
    .max(B.MAX_BRANDS)
    .nullish(),
  uaMobile: flag,
  uaPlatform: text(),
  uaPlatformVersion: text(),
  uaModel: text(),
  uaArchitecture: text(),
  language: text(),
  languages: z.array(z.string().max(L.MAX_TEXT_CHARS)).max(B.MAX_LANGUAGES).nullish(),
  timezone: text(),
  screenWidth: integer(B.MAX_SCREEN_PX),
  screenHeight: integer(B.MAX_SCREEN_PX),
  viewportWidth: integer(B.MAX_SCREEN_PX),
  viewportHeight: integer(B.MAX_SCREEN_PX),
  devicePixelRatio: decimal(B.MAX_DEVICE_PIXEL_RATIO),
  hardwareConcurrency: integer(B.MAX_CPU_CORES),
  deviceMemory: decimal(B.MAX_DEVICE_MEMORY_GB),
  maxTouchPoints: integer(B.MAX_TOUCH_POINTS),
  connectionType: text(),
  connectionRttMs: decimal(B.MAX_CONNECTION_RTT_MS),
  connectionDownlinkMbps: decimal(B.MAX_DOWNLINK_MBPS),
  saveData: flag,
  prefersReducedMotion: flag,
  colorScheme: z.enum(['light', 'dark']).nullish(),
  webglVendor: text(),
  webglRenderer: text(),
  referrerOrigin: text(),
});

/** OCP: register a schema here when a payload starts feeding typed columns. */
const PAYLOAD_SCHEMAS: Partial<Record<ClientTelemetryEventType, z.ZodType>> = {
  [ClientTelemetryEventType.SESSION_STARTED]: deviceProfileSchema,
};

export const clientTelemetryEnvelopeSchema = z.object({
  eventId: z.uuid(),
  type: z.enum(EVENT_TYPES),
  occurredAt: z.number().int().positive(),
  sessionId: z.uuid(),
  playerId: id.nullable(),
  roomId: id.nullable(),
  page: z.string().max(L.MAX_PAGE_CHARS),
  appVersion: z.string().min(1).max(L.MAX_APP_VERSION_CHARS),
  payload: payloadSchema,
}).superRefine((event, ctx) => {
  const schema = PAYLOAD_SCHEMAS[event.type];
  if (!schema) return;
  const result = schema.safeParse(event.payload);
  for (const issue of result.error?.issues ?? []) {
    ctx.addIssue({ code: 'custom', message: issue.message, path: ['payload', ...issue.path] });
  }
});

export const clientTelemetryBatchSchema = z.object({
  sentAt: z.number().int().positive(),
  events: z.array(z.unknown()).min(1).max(L.MAX_EVENTS_PER_BATCH),
});

export type ParseClientTelemetryBatchResult =
  | { ok: true; events: AnyClientTelemetryEnvelope[]; rejected: number }
  | { ok: false; error: string };

/**
 * @param now ingest clock, used to drop events whose client clock is implausibly far off.
 */
export function parseClientTelemetryBatch(input: unknown, now: number): ParseClientTelemetryBatchResult {
  const batch = clientTelemetryBatchSchema.safeParse(input);
  if (!batch.success) return { ok: false, error: z.prettifyError(batch.error) };

  const events: AnyClientTelemetryEnvelope[] = [];
  for (const candidate of batch.data.events) {
    const event = clientTelemetryEnvelopeSchema.safeParse(candidate);
    if (event.success && Math.abs(now - event.data.occurredAt) <= L.MAX_CLOCK_SKEW_MS) {
      events.push(event.data as AnyClientTelemetryEnvelope);
    }
  }
  return { ok: true, events, rejected: batch.data.events.length - events.length };
}
