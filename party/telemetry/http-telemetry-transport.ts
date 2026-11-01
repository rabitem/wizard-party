import {
  TELEMETRY_HEADERS,
  signTelemetryRequest,
  type AnyTelemetryEnvelope,
  type TelemetryBatch,
} from '../../shared/telemetry';
import { postForDelivery, type DeliveryResult } from '../utils/http-delivery';

export type { DeliveryResult } from '../utils/http-delivery';

export interface TelemetryTransport {
  send(events: AnyTelemetryEnvelope[]): Promise<DeliveryResult>;
}

export interface HttpTelemetryTransportOptions {
  url: string;
  secret: string;
  producer: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
}

export class HttpTelemetryTransport implements TelemetryTransport {
  constructor(private readonly options: HttpTelemetryTransportOptions) {}

  async send(events: AnyTelemetryEnvelope[]): Promise<DeliveryResult> {
    const now = this.options.now ?? Date.now;
    const sentAt = now();
    const batch: TelemetryBatch = { producer: this.options.producer, sentAt, events };
    const body = JSON.stringify(batch);
    const signature = await signTelemetryRequest(this.options.secret, sentAt, body);

    return postForDelivery({
      url: this.options.url,
      headers: {
        'content-type': 'application/json',
        [TELEMETRY_HEADERS.SIGNATURE]: signature,
        [TELEMETRY_HEADERS.TIMESTAMP]: String(sentAt),
      },
      body,
      timeoutMs: this.options.timeoutMs,
      fetch: this.options.fetch,
    });
  }
}
