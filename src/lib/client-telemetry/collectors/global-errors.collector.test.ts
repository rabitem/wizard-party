import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TelemetrySink } from '../client-telemetry';
import type { ClientErrorInput } from '../error-report';
import { createGlobalErrorsCollector } from './global-errors.collector';

let errors: ClientErrorInput[];
let sink: TelemetrySink;

/** An uncaught error as the browser dispatches it on window. */
function errorEvent(fields: { error?: unknown; message: string; filename: string; lineno: number; colno: number }): Event {
  return Object.assign(new Event('error'), fields);
}

function rejectionEvent(reason: unknown): Event {
  return Object.assign(new Event('unhandledrejection'), { reason });
}

beforeEach(() => {
  errors = [];
  sink = { track: vi.fn(), flush: vi.fn(), reportError: (input) => void errors.push(input) };
  vi.stubGlobal('window', new EventTarget());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createGlobalErrorsCollector', () => {
  it('should report an uncaught error with its message and source location', () => {
    createGlobalErrorsCollector().start(sink);
    const error = new TypeError('x is undefined');

    window.dispatchEvent(errorEvent({ error, message: 'Uncaught TypeError: x is undefined', filename: 'https://wizardparty.test/app.js', lineno: 12, colno: 7 }));

    expect(errors).toEqual([
      { kind: 'error', error, message: 'Uncaught TypeError: x is undefined', source: 'https://wizardparty.test/app.js', line: 12, column: 7 },
    ]);
  });

  it('should report an unhandled promise rejection with its reason', () => {
    createGlobalErrorsCollector().start(sink);

    window.dispatchEvent(rejectionEvent('socket closed'));

    expect(errors).toEqual([{ kind: 'unhandledrejection', error: 'socket closed' }]);
  });

  it('should stop reporting once stopped', () => {
    const stop = createGlobalErrorsCollector().start(sink);

    stop();
    window.dispatchEvent(errorEvent({ message: 'late', filename: '', lineno: 0, colno: 0 }));
    window.dispatchEvent(rejectionEvent(new Error('late')));

    expect(errors).toEqual([]);
  });
});
