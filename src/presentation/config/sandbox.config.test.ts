import { describe, expect, it } from 'vitest';
import { SANDBOX_VIEWPORTS, formFactorOf } from './sandbox.config';

describe('sandbox viewports', () => {
  it('should have unique ids', () => {
    const ids = SANDBOX_VIEWPORTS.map((viewport) => viewport.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should classify every viewport the way its entry declares', () => {
    for (const viewport of SANDBOX_VIEWPORTS) {
      expect(formFactorOf(viewport.width, viewport.height, viewport.hasTouch), viewport.id).toBe(viewport.formFactor);
      // Phones and tablets are touch devices: playability thresholds assume touch input there
      if (viewport.formFactor !== 'desktop') expect(viewport.hasTouch, viewport.id).toBe(true);
    }
  });
});
