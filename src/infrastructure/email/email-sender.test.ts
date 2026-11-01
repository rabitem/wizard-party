import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { cleanEnvValue } = await import('./email-sender');

describe('cleanEnvValue', () => {
  it('should strip a byte-order mark, control characters and surrounding whitespace', () => {
    expect(cleanEnvValue('﻿re_abc123\r\n')).toBe('re_abc123');
    expect(cleanEnvValue('  Wizard Party <noreply@wizardparty.fun> ')).toBe('Wizard Party <noreply@wizardparty.fun>');
  });

  it('should treat empty values as unset', () => {
    expect(cleanEnvValue('﻿  ')).toBeUndefined();
    expect(cleanEnvValue(undefined)).toBeUndefined();
  });
});
