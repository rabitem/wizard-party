import { describe, expect, it } from 'vitest';

import { CLIENT_TELEMETRY_LIMITS } from '@shared/telemetry';

import { toClientErrorPayload } from './error-report';

describe('toClientErrorPayload', () => {
  it('extracts message, name and stack from Error instances', () => {
    const error = new TypeError('bad thing');
    const payload = toClientErrorPayload({ kind: 'error', error, source: 'https://x.test/app.js?token=secret#frag', line: 3, column: 7 });
    expect(payload).toMatchObject({ kind: 'error', message: 'bad thing', name: 'TypeError', source: 'https://x.test/app.js', line: 3, column: 7 });
    expect(payload.stack).toContain('bad thing');
  });

  it('truncates message and stack to the contract limits', () => {
    const error = new Error('m'.repeat(5_000));
    error.stack = 's'.repeat(10_000);
    const payload = toClientErrorPayload({ kind: 'boundary', error, digest: 'd1' });
    expect(payload.message).toHaveLength(CLIENT_TELEMETRY_LIMITS.MAX_ERROR_MESSAGE_CHARS);
    expect(payload.stack).toHaveLength(CLIENT_TELEMETRY_LIMITS.MAX_STACK_CHARS);
    expect(payload.digest).toBe('d1');
  });

  it('handles non-Error rejection reasons', () => {
    expect(toClientErrorPayload({ kind: 'unhandledrejection', error: 'plain string' }).message).toBe('plain string');
    expect(toClientErrorPayload({ kind: 'unhandledrejection', error: { code: 1 } })).toMatchObject({
      message: 'Unknown error',
      name: null,
      stack: null,
      line: null,
    });
  });
});
