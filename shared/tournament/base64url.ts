const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });

const BASE64URL = /^[A-Za-z0-9_-]*$/;

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Null for anything that is not canonical, unpadded base64url. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL.test(value) || value.length % 4 === 1) return null;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export function textToBase64Url(text: string): string {
  return bytesToBase64Url(encoder.encode(text));
}

export function base64UrlToText(value: string): string | null {
  const bytes = base64UrlToBytes(value);
  if (!bytes) return null;
  try {
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}
