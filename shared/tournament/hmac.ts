/** HMAC-SHA256 over WebCrypto: runs on Workers, Node and browsers. */

const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function hmacSign(secret: string, message: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await importKey(secret), encoder.encode(message)));
}

/** Constant time (subtle.verify). */
export async function hmacVerify(secret: string, message: string, signature: Uint8Array<ArrayBuffer>): Promise<boolean> {
  return crypto.subtle.verify('HMAC', await importKey(secret), signature, encoder.encode(message));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
