import type { ClientTelemetryCollector } from '../client-telemetry';

/**
 * WebGL context loss / restore of any canvas in the document. The events do not bubble, so they
 * are observed in the capture phase on window (the same approach as useWebGLContext).
 */
export function createWebGLContextCollector(): ClientTelemetryCollector {
  return {
    name: 'webgl-context',
    scope: 'global',
    start(sink) {
      const onLost = () => sink.track('webgl.context', { state: 'lost' });
      const onRestored = () => sink.track('webgl.context', { state: 'restored' });
      window.addEventListener('webglcontextlost', onLost, true);
      window.addEventListener('webglcontextrestored', onRestored, true);
      return () => {
        window.removeEventListener('webglcontextlost', onLost, true);
        window.removeEventListener('webglcontextrestored', onRestored, true);
      };
    },
  };
}
