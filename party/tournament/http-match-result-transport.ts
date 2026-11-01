import type { RecordResultOutcome } from '../../shared/domain/tournament';
import { buildMatchResultRequest, parseRecordResultOutcome, type MatchProgressReport, type MatchResultReport } from '../../shared/tournament';
import { postForDelivery, type DeliveryResult } from '../utils/http-delivery';

/** A delivered result carries the server's answer: recorded, duplicate, superseded or ignored. */
export type MatchResultDelivery =
  | { status: 'delivered'; outcome: RecordResultOutcome }
  | Exclude<DeliveryResult, { status: 'delivered' }>;

export interface MatchResultTransport {
  send(report: MatchResultReport): Promise<MatchResultDelivery>;
  /** Progress pings answer nothing the worker needs: delivered, retry or rejected. */
  sendProgress(ping: MatchProgressReport): Promise<DeliveryResult>;
}

export interface HttpMatchResultTransportOptions {
  /** TOURNAMENT_RESULT_URL, e.g. https://wizard.example/api/tournaments/match-results */
  url: string;
  secret: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
}

/**
 * POSTs a signed report (HMAC over `tournament-result.v1.${timestamp}.${body}`). The route answers
 * 400/413/422 for reports it will never accept (dead letter) and anything else non-2xx for "later",
 * including 401 while the two sides disagree on the secret. A delivered result reads the route's
 * `{ outcome }` (servers from before it answer without one: recorded).
 */
export class HttpMatchResultTransport implements MatchResultTransport {
  constructor(private readonly options: HttpMatchResultTransportOptions) {}

  async send(report: MatchResultReport): Promise<MatchResultDelivery> {
    const result = await this.post(report, true);
    return result.status === 'delivered' ? { status: 'delivered', outcome: parseRecordResultOutcome(result.body) } : result;
  }

  async sendProgress(ping: MatchProgressReport): Promise<DeliveryResult> {
    const result = await this.post(ping, false);
    return result.status === 'delivered' ? { status: 'delivered' } : result;
  }

  private async post(report: MatchResultReport | MatchProgressReport, readBody: boolean): Promise<DeliveryResult> {
    const now = this.options.now ?? Date.now;
    const { body, headers } = await buildMatchResultRequest(this.options.secret, report, now());
    return postForDelivery({ url: this.options.url, headers, body, timeoutMs: this.options.timeoutMs, fetch: this.options.fetch, readBody });
  }
}
