/**
 * Text bounding for telemetry payloads.
 *
 * Producer-controlled strings (chat, user agents, error messages) are truncated so one event stays
 * small, and made safe for Postgres jsonb, which rejects NUL characters and lone UTF-16 surrogates.
 */

const NUL_CHARACTERS = /\u0000/g;
const LONE_SURROGATES = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const REPLACEMENT_CHARACTER = '�';

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** Truncates to at most `maxLength` UTF-16 units without splitting a surrogate pair. */
export function truncateText(value: string, maxLength: number): string {
  const clean = value.replace(NUL_CHARACTERS, '').replace(LONE_SURROGATES, REPLACEMENT_CHARACTER);
  if (clean.length <= maxLength) return clean;
  const end = isHighSurrogate(clean.charCodeAt(maxLength - 1)) ? maxLength - 1 : maxLength;
  return clean.slice(0, end);
}

/** A non-empty, bounded string, or null for anything else (missing, empty, non-string). */
export function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = truncateText(value.trim(), maxLength);
  return text.length > 0 ? text : null;
}
