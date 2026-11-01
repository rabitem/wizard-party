/**
 * At-least-once delivery of signed JSON to the Next.js server, shared by the telemetry and the
 * tournament result outboxes: one POST, classified into delivered / retry later / never retry.
 */

export type DeliveryResult =
  /** `body`: the parsed JSON answer, only when asked for with `readBody` (null without a JSON body). */
  | { status: 'delivered'; body?: unknown }
  /** Worth retrying later: network errors, 5xx, 429, auth misconfiguration. */
  | { status: 'retry'; reason: string }
  /** The consumer will never accept this payload; retrying would block the queue forever. */
  | { status: 'rejected'; reason: string };

/** Statuses the consumers answer for payloads that are invalid as such (see their route contracts). */
const PERMANENT_REJECTION_STATUSES = new Set([400, 413, 422]);
const DEFAULT_DELIVERY_TIMEOUT_MS = 10_000;
const MAX_REASON_DETAIL_LENGTH = 500;

/** Exponential backoff between failed deliveries: 5 s, 10 s, 20 s, ... capped at 10 min. */
export const DELIVERY_BACKOFF = {
  BASE_MS: 5_000,
  MAX_MS: 10 * 60 * 1000,
} as const;

export function deliveryBackoffMs(consecutiveFailures: number): number {
  return Math.min(DELIVERY_BACKOFF.MAX_MS, DELIVERY_BACKOFF.BASE_MS * 2 ** Math.max(0, consecutiveFailures - 1));
}

export interface PostForDeliveryInput {
  url: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  /** Read the JSON answer of a delivered request into `body` (consumers that answer something). */
  readBody?: boolean;
}

export async function postForDelivery(input: PostForDeliveryInput): Promise<DeliveryResult> {
  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(input.url, {
      method: 'POST',
      headers: input.headers,
      body: input.body,
      signal: AbortSignal.timeout(input.timeoutMs ?? DEFAULT_DELIVERY_TIMEOUT_MS),
    });
  } catch (error) {
    return { status: 'retry', reason: error instanceof Error ? error.message : String(error) };
  }

  if (response.ok) {
    if (!input.readBody) return { status: 'delivered' };
    // Delivered is delivered: an unreadable answer must never turn into a retry.
    return { status: 'delivered', body: await response.json().catch(() => null) };
  }

  const detail = (await response.text().catch(() => '')).slice(0, MAX_REASON_DETAIL_LENGTH);
  const reason = `HTTP ${response.status}${detail ? `: ${detail}` : ''}`;
  return PERMANENT_REJECTION_STATUSES.has(response.status)
    ? { status: 'rejected', reason }
    : { status: 'retry', reason };
}
