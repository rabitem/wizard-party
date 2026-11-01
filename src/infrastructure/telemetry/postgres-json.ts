/**
 * Postgres jsonb (and text) cannot hold U+0000, and JSON.stringify encodes it as the escape
 * `\u0000`, which jsonb rejects ("unsupported Unicode escape sequence"). One NUL in one client
 * string (an error message, a key) would otherwise abort the whole ingest transaction.
 *
 * Matches the escape only when its backslash is not itself escaped: `\\u0000` is the literal text
 * "\u0000" and stays as it is.
 */
const ESCAPED_NUL = /(?<!\\)((?:\\\\)*)\\u0000/g;

/** JSON.stringify for values bound as `$n::jsonb`, with NUL characters removed from keys and strings. */
export function toPostgresJson(value: unknown): string {
  return JSON.stringify(value).replace(ESCAPED_NUL, '$1');
}
