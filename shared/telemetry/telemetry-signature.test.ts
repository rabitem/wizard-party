import { describe, expect, it } from 'vitest';

import { signTelemetryRequest, verifyTelemetrySignature } from './telemetry-signature';

describe('telemetry signature', () => {
  it('accepts a valid signature and rejects tampering or stale timestamps', async () => {
    const signature = await signTelemetryRequest('s3cret', 1_000, '{"a":1}');
    const base = { secret: 's3cret', signature, timestamp: '1000', body: '{"a":1}', now: 1_000, toleranceMs: 60_000 };
    await expect(verifyTelemetrySignature(base)).resolves.toBe(true);
    await expect(verifyTelemetrySignature({ ...base, body: '{"a":2}' })).resolves.toBe(false);
    await expect(verifyTelemetrySignature({ ...base, secret: 'other' })).resolves.toBe(false);
    await expect(verifyTelemetrySignature({ ...base, now: 1_000_000 })).resolves.toBe(false);
    await expect(verifyTelemetrySignature({ ...base, signature: 'zz' })).resolves.toBe(false);
  });
});
