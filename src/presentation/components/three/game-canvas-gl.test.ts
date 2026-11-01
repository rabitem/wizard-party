import { describe, expect, it } from 'vitest';
import { getGameCanvasGlOptions } from './game-canvas-gl';

describe('getGameCanvasGlOptions', () => {
  it('should follow the quality tier for native antialiasing', () => {
    expect(getGameCanvasGlOptions({ antialias: true }).antialias).toBe(true);
    expect(getGameCanvasGlOptions({ antialias: false }).antialias).toBe(false);
  });

  it('should let the browser discard the drawing buffer (the sandbox reads frames inside the render callback)', () => {
    expect(getGameCanvasGlOptions({ antialias: false }).preserveDrawingBuffer).toBe(false);
  });
});
