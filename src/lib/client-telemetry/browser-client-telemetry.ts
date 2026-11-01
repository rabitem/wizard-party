import { v7 as uuidv7 } from 'uuid';

import { createBeaconTransport } from './beacon-transport';
import { CLIENT_TELEMETRY_CONFIG } from './client-telemetry.config';
import { ClientTelemetryClient } from './client-telemetry';
import { createDefaultCollectors } from './collectors';
import { currentPagePath, getOrCreateTabSessionId, resolveAppVersion } from './session-context';

function onPageHidden(task: () => void): () => void {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') task();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pagehide', task);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pagehide', task);
  };
}

function every(task: () => void, intervalMs: number): () => void {
  const handle = window.setInterval(task, intervalMs);
  return () => window.clearInterval(handle);
}

/**
 * The app-wide client telemetry instance. Constructing it touches no browser API, so importing it
 * from server-rendered modules is safe; everything browser-specific happens in `start()`.
 */
export const clientTelemetry = new ClientTelemetryClient({
  transport: createBeaconTransport(),
  collectors: createDefaultCollectors(),
  now: Date.now,
  createEventId: uuidv7,
  getSessionId: getOrCreateTabSessionId,
  getPage: currentPagePath,
  appVersion: resolveAppVersion(),
  schedule: (task) => setTimeout(task, 0),
  every,
  onPageHidden,
  flushIntervalMs: CLIENT_TELEMETRY_CONFIG.FLUSH_INTERVAL_MS,
  flushThreshold: CLIENT_TELEMETRY_CONFIG.FLUSH_THRESHOLD_EVENTS,
  maxBuffered: CLIENT_TELEMETRY_CONFIG.MAX_BUFFERED_EVENTS,
  maxDistinctErrors: CLIENT_TELEMETRY_CONFIG.MAX_DISTINCT_ERRORS_PER_SESSION,
});
