import { describe, expect, it } from 'vitest';

import { createLayoutProfile, resolveLayoutPolicy } from '@/presentation/hooks/layout/layout-policy';
import { canDockSidePanel, getStandingsDockRegion, resolveStandingsMode } from './leaderboard-dock';

const policyFor = (width: number, height: number, coarse = false) =>
  resolveLayoutPolicy(createLayoutProfile(width, height, coarse));

describe('canDockSidePanel', () => {
  it('should dock beside the table on laptops and larger screens', () => {
    for (const [width, height] of [[1366, 768], [1440, 900], [1920, 1080], [3840, 2160]]) {
      expect(canDockSidePanel(createLayoutProfile(width, height, false)), `${width}x${height}`).toBe(true);
    }
  });

  it('should not dock where the panel would cover seats (tablets, 1024x768)', () => {
    for (const [width, height] of [[1024, 768], [820, 1180], [1180, 820], [768, 1024]]) {
      expect(canDockSidePanel(createLayoutProfile(width, height, true)), `${width}x${height}`).toBe(false);
    }
  });

  it('should account for a wider panel', () => {
    const laptop = createLayoutProfile(1366, 768, false);
    expect(canDockSidePanel(laptop, 325)).toBe(true);
    expect(canDockSidePanel(laptop, 500)).toBe(false);
  });
});

describe('resolveStandingsMode', () => {
  it('should use the sheet on the phone HUD whatever the preference', () => {
    expect(resolveStandingsMode(policyFor(390, 844, true), 'right')).toBe('sheet');
    expect(resolveStandingsMode(policyFor(844, 390, true), 'hidden')).toBe('sheet');
  });

  it('should keep the hidden preference as a top-bar popover', () => {
    expect(resolveStandingsMode(policyFor(1920, 1080), 'hidden')).toBe('popover');
  });

  it('should dock side panels only when they fit and collapse them to the popover otherwise', () => {
    expect(resolveStandingsMode(policyFor(1366, 768), 'right')).toBe('docked');
    expect(resolveStandingsMode(policyFor(1366, 768), 'left')).toBe('docked');
    expect(resolveStandingsMode(policyFor(820, 1180, true), 'right')).toBe('popover');
    expect(resolveStandingsMode(policyFor(1024, 768), 'left')).toBe('popover');
  });

  it('should dock the horizontal bottom panel on every non-phone layout', () => {
    expect(resolveStandingsMode(policyFor(1024, 768), 'bottom')).toBe('docked');
  });
});

describe('getStandingsDockRegion', () => {
  it('should map each position to its HUD region', () => {
    expect(getStandingsDockRegion('left')).toBe('dock-left');
    expect(getStandingsDockRegion('right')).toBe('dock-right');
    expect(getStandingsDockRegion('bottom')).toBe('bottom');
  });
});
