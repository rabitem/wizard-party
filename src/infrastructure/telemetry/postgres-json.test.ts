import { describe, expect, it } from 'vitest';

import { toPostgresJson } from './postgres-json';

describe('toPostgresJson', () => {
  it('removes NUL characters from strings and keys', () => {
    const json = toPostgresJson({ ['k\u0000ey']: 'a\u0000b', nested: ['\u0000'] });
    expect(json).not.toContain('\\u0000');
    expect(JSON.parse(json)).toEqual({ key: 'ab', nested: [''] });
  });

  it('keeps an escaped backslash followed by the literal text u0000', () => {
    const value = { literal: '\\u0000', mixed: '\\\u0000' };
    expect(JSON.parse(toPostgresJson(value))).toEqual({ literal: '\\u0000', mixed: '\\' });
  });

  it('leaves other values untouched', () => {
    const value = { a: 1, b: 'text', c: null, d: [true] };
    expect(toPostgresJson(value)).toBe(JSON.stringify(value));
  });
});
