import type { ClientTelemetryCollector } from '../client-telemetry';
import { createGlobalErrorsCollector } from './global-errors.collector';
import { createRenderPerformanceCollector } from './render-performance.collector';
import { createSessionProfileCollector } from './session-profile.collector';
import { createWebGLContextCollector } from './webgl-context.collector';
import { createWebVitalsCollector } from './web-vitals.collector';

/** Registry of browser collectors. Add a collector here; the client needs no changes. */
export function createDefaultCollectors(): ClientTelemetryCollector[] {
  return [
    createSessionProfileCollector(),
    createWebVitalsCollector(),
    createGlobalErrorsCollector(),
    createWebGLContextCollector(),
    createRenderPerformanceCollector(),
  ];
}
