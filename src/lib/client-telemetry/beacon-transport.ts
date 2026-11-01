import { CLIENT_TELEMETRY_ENDPOINT } from '@shared/telemetry';

import type { TelemetryTransport } from './telemetry-queue';

/** text/plain is CORS-safelisted, so sendBeacon never triggers a preflight. */
const BEACON_CONTENT_TYPE = 'text/plain;charset=UTF-8';

/**
 * sendBeacon survives page unload and does not block it. When the browser refuses a beacon it is
 * almost always the keepalive quota, which fetch keepalive shares, so the refusal is reported to
 * the queue (which keeps the events) instead of retrying via fetch. fetch keepalive is only used
 * where sendBeacon is unavailable.
 */
export function createBeaconTransport(endpoint: string = CLIENT_TELEMETRY_ENDPOINT): TelemetryTransport {
  return (body) => {
    if (typeof navigator === 'undefined') return true;
    if (typeof navigator.sendBeacon === 'function') {
      try {
        return navigator.sendBeacon(endpoint, new Blob([body], { type: BEACON_CONTENT_TYPE }));
      } catch {
        // Fall through to fetch.
      }
    }
    if (typeof fetch !== 'function') return true;
    void fetch(endpoint, {
      method: 'POST',
      body,
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'content-type': BEACON_CONTENT_TYPE },
    }).catch(() => undefined);
    return true;
  };
}
