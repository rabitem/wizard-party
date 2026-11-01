import { describe, expect, it } from 'vitest';

import { formatDate, formatPercent, ordinal } from './public-profile-format';

describe('public profile formatting', () => {
  it('should format ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 103, 111].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '103rd', '111th']);
  });

  it('should format dates in UTC and ratios as percent', () => {
    expect(formatDate(Date.UTC(2026, 0, 1, 23, 30))).toBe('Jan 1, 2026');
    expect(formatPercent(0.456)).toBe('46%');
  });
});
