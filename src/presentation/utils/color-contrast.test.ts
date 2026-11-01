import { describe, expect, it } from 'vitest';

import { contrastRatio, ensureContrastOnDark } from './color-contrast';

/** Channels of a #rrggbb colour as returned by ensureContrastOnDark */
function channelsOf(hex: string): number[] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got ${hex}`);
  return match.slice(1).map((channel) => Number.parseInt(channel, 16));
}

describe('contrastRatio', () => {
  it('should follow the WCAG formula', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
    // Short hex and a missing # are accepted
    expect(contrastRatio('fff', '#000000')).toBeCloseTo(21, 5);
  });

  it('should treat anything but a hex colour as no contrast', () => {
    expect(contrastRatio('rgb(1,2,3)', '#000')).toBe(1);
    expect(contrastRatio('#12345', '#000')).toBe(1);
  });

  it('should be symmetric', () => {
    expect(contrastRatio('#2f7a3a', '#1a1510')).toBeCloseTo(contrastRatio('#1a1510', '#2f7a3a'), 10);
  });
});

describe('ensureContrastOnDark', () => {
  it('should keep colours that are already readable', () => {
    expect(ensureContrastOnDark('#9ff0ff', '#3e3021', 4.5)).toBe('#9ff0ff');
  });

  it('should lighten the Solarpunk grove green until it reaches AA on the HUD panel', () => {
    expect(contrastRatio('#2f7a3a', '#3e3021')).toBeLessThan(4.5);

    const readable = ensureContrastOnDark('#2f7a3a', '#3e3021', 4.5);

    expect(readable).not.toBe('#2f7a3a');
    expect(contrastRatio(readable, '#3e3021')).toBeGreaterThanOrEqual(4.5);
    // Still a green: the green channel stays the strongest
    const [r, g, b] = channelsOf(readable);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it('should leave unparseable colours alone', () => {
    expect(ensureContrastOnDark('currentColor', '#000000', 4.5)).toBe('currentColor');
  });
});
