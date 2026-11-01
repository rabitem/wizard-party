import type { ClientTelemetryCollector } from '../client-telemetry';

/** Uncaught errors and unhandled promise rejections. Deduplication happens in the sink. */
export function createGlobalErrorsCollector(): ClientTelemetryCollector {
  return {
    name: 'global-errors',
    scope: 'global',
    start(sink) {
      const onError = (event: ErrorEvent) => {
        sink.reportError({
          kind: 'error',
          error: event.error,
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
        });
      };
      const onRejection = (event: PromiseRejectionEvent) => {
        sink.reportError({ kind: 'unhandledrejection', error: event.reason });
      };
      window.addEventListener('error', onError);
      window.addEventListener('unhandledrejection', onRejection);
      return () => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onRejection);
      };
    },
  };
}
