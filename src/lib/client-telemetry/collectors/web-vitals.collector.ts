import type { Metric } from 'web-vitals';

import type { ClientTelemetryCollector, TelemetrySink } from '../client-telemetry';

/** Metric ids look like `v5-1700000000000-1234567890`; keep them bounded. */
const MAX_METRIC_ID_CHARS = 64;
const VALUE_DECIMALS = 4;

const round = (value: number) => Number(value.toFixed(VALUE_DECIMALS));

/**
 * Core Web Vitals via the `web-vitals` package (loaded lazily, outside the initial bundle).
 * web-vitals listeners cannot be removed, so they are registered once per page and forward to
 * whichever sink is active; while telemetry is stopped they are dropped.
 */
export function createWebVitalsCollector(): ClientTelemetryCollector {
  let activeSink: TelemetrySink | null = null;
  let registered = false;

  const report = (metric: Metric) => {
    activeSink?.track('web_vital', {
      name: metric.name,
      value: round(metric.value),
      delta: round(metric.delta),
      rating: metric.rating,
      navigationType: metric.navigationType,
      metricId: metric.id.slice(0, MAX_METRIC_ID_CHARS),
    });
    // Final CLS / INP / LCP values are reported while the page is being hidden; send them right
    // away, the page may be frozen or discarded before the next flush.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') activeSink?.flush();
  };

  return {
    name: 'web-vitals',
    scope: 'global',
    start(sink) {
      activeSink = sink;
      if (!registered) {
        registered = true;
        void import('web-vitals')
          .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
            for (const subscribe of [onCLS, onFCP, onINP, onLCP, onTTFB]) subscribe(report);
          })
          .catch(() => {
            registered = false;
          });
      }
      return () => {
        activeSink = null;
      };
    },
  };
}
