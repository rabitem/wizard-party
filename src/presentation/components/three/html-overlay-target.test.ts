import { describe, expect, it } from 'vitest';
import type { RootState } from '@react-three/fiber';
import { selectHtmlOverlayTargetReady } from './html-overlay-target';

function stateWithConnected(connected: unknown): Pick<RootState, 'events'> {
  return { events: { connected } as RootState['events'] };
}

describe('selectHtmlOverlayTargetReady', () => {
  it('should hold Html overlays back until R3F has connected events', () => {
    expect(selectHtmlOverlayTargetReady(stateWithConnected(undefined))).toBe(false);
    expect(selectHtmlOverlayTargetReady(stateWithConnected(null))).toBe(false);
    expect(selectHtmlOverlayTargetReady(stateWithConnected(false))).toBe(false);
  });

  it('should allow Html overlays once events are connected to the canvas container', () => {
    expect(selectHtmlOverlayTargetReady(stateWithConnected({ nodeType: 1 }))).toBe(true);
  });
});
