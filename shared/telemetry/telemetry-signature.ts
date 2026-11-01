/**
 * HMAC-SHA256 request signing for telemetry ingest (WebCrypto: runs on Workers and Node).
 * Signed string: `${timestamp}.${body}` so a captured request cannot be replayed outside the
 * tolerance window or with a different body.
 */

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export async function signTelemetryRequest(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await importKey(secret);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${body}`)));
}

export interface VerifyTelemetrySignatureInput {
  secret: string;
  signature: string | null;
  timestamp: string | null;
  body: string;
  now: number;
  toleranceMs: number;
}

export async function verifyTelemetrySignature(input: VerifyTelemetrySignatureInput): Promise<boolean> {
  const { secret, signature, timestamp, body, now, toleranceMs } = input;
  if (!signature || !timestamp) return false;

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > toleranceMs) return false;

  const signatureBytes = fromHex(signature);
  if (!signatureBytes) return false;

  // subtle.verify compares in constant time.
  const key = await importKey(secret);
  return crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(`${timestampMs}.${body}`));
}
