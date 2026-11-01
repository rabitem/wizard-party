import { describe, expect, it } from 'vitest';
import { TURN_TIMER_PLACEMENT } from '@/presentation/config/responsive.config';

import {
  createLayoutProfile,
  getHudCssVariables,
  isSameLayoutProfile,
  resolveLayoutClass,
  resolveLayoutPolicy,
} from './layout-policy';

const touch = (width: number, height: number) => createLayoutProfile(width, height, true);
const mouse = (width: number, height: number) => createLayoutProfile(width, height, false);

describe('createLayoutProfile', () => {
  it('should derive the orientation from the aspect', () => {
    expect(touch(390, 844).orientation).toBe('portrait');
    expect(touch(844, 390).orientation).toBe('landscape');
    expect(touch(800, 800).orientation).toBe('portrait');
  });
});

describe('isSameLayoutProfile', () => {
  it('should compare size and pointer', () => {
    expect(isSameLayoutProfile(touch(390, 844), touch(390, 844))).toBe(true);
    expect(isSameLayoutProfile(touch(390, 844), mouse(390, 844))).toBe(false);
    expect(isSameLayoutProfile(touch(390, 844), touch(844, 390))).toBe(false);
  });
});

describe('resolveLayoutClass', () => {
  it.each([
    ['iPhone SE portrait', touch(375, 667), 'phone-portrait'],
    ['iPhone mini portrait', touch(375, 812), 'phone-portrait'],
    ['large phone portrait', touch(430, 932), 'phone-portrait'],
    ['foldable folded', touch(344, 882), 'phone-portrait'],
    ['iPhone SE landscape', touch(667, 375), 'phone-landscape'],
    ['iPhone 14 landscape', touch(750, 340), 'phone-landscape'],
    ['large phone landscape', touch(932, 430), 'phone-landscape'],
    ['short desktop window', mouse(1280, 480), 'phone-landscape'],
    ['foldable unfolded', touch(884, 1104), 'tablet'],
    ['iPad portrait', touch(820, 1180), 'tablet'],
    ['iPad landscape', touch(1180, 820), 'tablet'],
    ['touch laptop', touch(1024, 768), 'tablet'],
    ['small laptop', mouse(1024, 768), 'desktop'],
    ['laptop', mouse(1366, 768), 'desktop'],
    ['4K monitor', mouse(3840, 2160), 'desktop'],
  ] as const)('should classify %s', (_label, profile, expected) => {
    expect(resolveLayoutClass(profile)).toBe(expected);
  });
});

describe('resolveLayoutPolicy', () => {
  it('should give portrait phones the bidding sheet, the portrait camera and the prompt row', () => {
    const policy = resolveLayoutPolicy(touch(375, 667));

    expect(policy.compactHud).toBe(true);
    expect(policy.biddingSurface).toBe('sheet');
    expect(policy.cameraPreset).toBe('mobile');
    expect(policy.density).toBe('compact');
    expect(policy.promptBelowTopBar).toBe(true);
  });

  it('should give landscape phones a compact bidding panel and the landscape camera', () => {
    const policy = resolveLayoutPolicy(touch(750, 340));

    expect(policy.compactHud).toBe(true);
    expect(policy.biddingSurface).toBe('panel');
    expect(policy.density).toBe('compact');
    expect(policy.cameraPreset).toBe('desktop');
    expect(policy.promptBelowTopBar).toBe(false);
  });

  it('should give tablets the regular panels with touch-sized controls', () => {
    const policy = resolveLayoutPolicy(touch(820, 1180));

    expect(policy.compactHud).toBe(false);
    expect(policy.biddingSurface).toBe('panel');
    expect(policy.density).toBe('regular');
    expect(policy.tapTargetPx).toBe(44);
  });

  it('should keep the turn timer in the top rows, clear of the hand', () => {
    expect(resolveLayoutPolicy(touch(375, 667)).turnTimer).toMatchObject({ region: 'prompt', opens: 'below', size: 'compact' });
    expect(resolveLayoutPolicy(touch(750, 340)).turnTimer).toMatchObject({ region: 'status', opens: 'below', size: 'narrow' });
    expect(resolveLayoutPolicy(touch(1180, 820)).turnTimer).toMatchObject({ region: 'status', opens: 'below', size: 'regular' });
    expect(resolveLayoutPolicy(mouse(1920, 1080)).turnTimer.region).toBe('status');
  });

  it('should give a timer in an edge column of the top row a fixed width', () => {
    // A timer that grows with the player name would widen the column and squeeze the prompt
    // column (bidding panel) between the status bar and the top-bar buttons.
    for (const placement of Object.values(TURN_TIMER_PLACEMENT)) {
      if (placement.region === 'status' || placement.region === 'actions') {
        expect(placement.size).not.toBe('compact');
      }
    }
  });

  it.each([
    { pointer: 'touch portrait phone', profile: touch(375, 667), tapTargetPx: 44 },
    { pointer: 'touch landscape phone', profile: touch(750, 340), tapTargetPx: 44 },
    { pointer: 'touch tablet', profile: touch(1180, 820), tapTargetPx: 44 },
    { pointer: 'mouse laptop', profile: mouse(1366, 768), tapTargetPx: 0 },
    { pointer: 'mouse narrow window', profile: mouse(390, 844), tapTargetPx: 0 },
  ])('should size tap targets by pointer: $pointer', ({ profile, tapTargetPx }) => {
    expect(resolveLayoutPolicy(profile).tapTargetPx).toBe(tapTargetPx);
  });
});

describe('getHudCssVariables', () => {
  it('should expose touch sizes and the compact gutter on phones', () => {
    expect(getHudCssVariables(resolveLayoutPolicy(touch(375, 667)))).toEqual({
      '--hud-tap-target': '44px',
      '--hud-control-size': '44px',
      '--hud-gutter': '8px',
      '--hud-gap': '8px',
    });
  });

  it('should expose mouse sizes and the regular gutter on desktops', () => {
    expect(getHudCssVariables(resolveLayoutPolicy(mouse(1920, 1080)))).toEqual({
      '--hud-tap-target': '0px',
      '--hud-control-size': '40px',
      '--hud-gutter': '16px',
      '--hud-gap': '8px',
    });
  });
});
