import { CLIENT_TELEMETRY_CONFIG } from '../client-telemetry.config';
import type { ClientTelemetryCollector } from '../client-telemetry';
import { collectDeviceProfile, readHighEntropyHints, readWebGLInfo } from './device-profile';

function whenIdle(task: () => void, timeoutMs: number): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, timeoutMs);
  return () => window.clearTimeout(handle);
}

/** Emits `session.started` with the device / browser profile once per page load. */
export function createSessionProfileCollector(): ClientTelemetryCollector {
  let emitted = false;
  return {
    name: 'session-profile',
    scope: 'global',
    start(sink) {
      if (emitted) return () => undefined;
      let cancelled = false;
      const cancelIdle = whenIdle(() => {
        const profile = collectDeviceProfile({
          navigator,
          screen: window.screen ?? null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          devicePixelRatio: window.devicePixelRatio ?? null,
          matchMedia: typeof window.matchMedia === 'function' ? (query) => window.matchMedia(query) : null,
          referrer: document.referrer,
          origin: location.origin,
          webgl: readWebGLInfo(() => document.createElement('canvas')),
        });
        void readHighEntropyHints(navigator, CLIENT_TELEMETRY_CONFIG.HIGH_ENTROPY_HINTS_TIMEOUT_MS).then((hints) => {
          if (cancelled || emitted) return;
          emitted = true;
          sink.track('session.started', { ...profile, ...hints });
        });
      }, CLIENT_TELEMETRY_CONFIG.SESSION_PROFILE_IDLE_TIMEOUT_MS);
      return () => {
        cancelled = true;
        cancelIdle();
      };
    },
  };
}
