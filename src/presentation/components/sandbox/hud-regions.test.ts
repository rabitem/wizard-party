import { describe, expect, it } from 'vitest';
import { cssColorAlpha } from './hud-regions';

describe('cssColorAlpha', () => {
  it('should read the alpha of legacy rgb and rgba colours', () => {
    expect(cssColorAlpha('rgba(0, 0, 0, 0.5)')).toBe(0.5);
    expect(cssColorAlpha('rgb(12, 34, 56)')).toBe(1);
    expect(cssColorAlpha('rgba(0, 0, 0, 0)')).toBe(0);
  });

  it('should read the slash alpha of modern colour functions (Tailwind v4 computes to oklch and oklab)', () => {
    expect(cssColorAlpha('oklch(0.21 0.034 264.665 / 0.8)')).toBe(0.8);
    expect(cssColorAlpha('oklab(0 0 0 / 0.5)')).toBe(0.5);
    expect(cssColorAlpha('color(srgb 1 0 0 / 25%)')).toBe(0.25);
    expect(cssColorAlpha('rgb(0 0 0 / 40%)')).toBe(0.4);
    expect(cssColorAlpha('oklch(0.21 0.034 264.665)')).toBe(1);
  });

  it('should treat transparent and missing colours as no panel', () => {
    expect(cssColorAlpha('transparent')).toBe(0);
    expect(cssColorAlpha('')).toBe(0);
  });
});
