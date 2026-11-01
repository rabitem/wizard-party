import { describe, expect, it } from 'vitest';

import { centeredScrollLeft } from './account-tabs.utils';

describe('centeredScrollLeft', () => {
  it('should center a tab in the middle of the bar', () => {
    expect(centeredScrollLeft({ viewportWidth: 300, contentWidth: 900, itemOffset: 400, itemWidth: 100 })).toBe(300);
  });

  it('should clamp to the start and the end of the scrollable range', () => {
    expect(centeredScrollLeft({ viewportWidth: 300, contentWidth: 900, itemOffset: 10, itemWidth: 100 })).toBe(0);
    expect(centeredScrollLeft({ viewportWidth: 300, contentWidth: 900, itemOffset: 820, itemWidth: 80 })).toBe(600);
  });

  it('should not scroll when every tab fits', () => {
    expect(centeredScrollLeft({ viewportWidth: 900, contentWidth: 900, itemOffset: 700, itemWidth: 100 })).toBe(0);
  });
});
