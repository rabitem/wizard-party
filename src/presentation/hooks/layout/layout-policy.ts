import type { CSSProperties } from 'react';
import { HUD_LAYOUT_CONFIG, RESPONSIVE_CONFIG, TURN_TIMER_PLACEMENT } from '@/presentation/config/responsive.config';
import type {
  LayoutClass,
  LayoutPolicy,
  LayoutProfile,
} from '@/presentation/types/hud-layout.types';

/** Build a profile from raw viewport numbers. */
export function createLayoutProfile(width: number, height: number, coarsePointer: boolean): LayoutProfile {
  return {
    width,
    height,
    orientation: width > height ? 'landscape' : 'portrait',
    coarsePointer,
  };
}

export function isSameLayoutProfile(a: LayoutProfile, b: LayoutProfile): boolean {
  return a.width === b.width && a.height === b.height && a.coarsePointer === b.coarsePointer;
}

/**
 * Form factor from viewport size and pointer. Narrow or short viewports get the phone HUD
 * whatever the device; larger touch screens are tablets, larger mouse screens desktops.
 */
export function resolveLayoutClass(profile: LayoutProfile): LayoutClass {
  const isPhoneSized = profile.width < RESPONSIVE_CONFIG.PHONE_MAX_WIDTH
    || profile.height < RESPONSIVE_CONFIG.PHONE_MAX_HEIGHT;
  if (isPhoneSized) return profile.orientation === 'portrait' ? 'phone-portrait' : 'phone-landscape';
  return profile.coarsePointer ? 'tablet' : 'desktop';
}

/** Every HUD form-factor decision for one profile. Pure, so it is unit tested per device. */
export function resolveLayoutPolicy(profile: LayoutProfile): LayoutPolicy {
  const layoutClass = resolveLayoutClass(profile);
  const isPhone = layoutClass === 'phone-portrait' || layoutClass === 'phone-landscape';
  const isPortraitPhone = layoutClass === 'phone-portrait';

  return {
    profile,
    layoutClass,
    compactHud: isPhone,
    // A sheet only fits under a tall screen; in landscape it would hide the hand and the button
    biddingSurface: isPortraitPhone ? 'sheet' : 'panel',
    density: isPhone ? 'compact' : 'regular',
    // The steep portrait preset only suits portrait phones; landscape phones frame like desktops
    cameraPreset: isPortraitPhone ? 'mobile' : 'desktop',
    tapTargetPx: profile.coarsePointer ? RESPONSIVE_CONFIG.TAP_TARGET_MIN_PX : 0,
    promptBelowTopBar: isPortraitPhone,
    turnTimer: TURN_TIMER_PLACEMENT[layoutClass],
  };
}

/** CSS custom properties the HUD reads (`.hud-tap-target`, `.hud-layout`, control sizes). */
export function getHudCssVariables(policy: LayoutPolicy): CSSProperties {
  const controlSize = policy.profile.coarsePointer
    ? RESPONSIVE_CONFIG.CONTROL_SIZE_PX.COARSE
    : RESPONSIVE_CONFIG.CONTROL_SIZE_PX.FINE;
  return {
    '--hud-tap-target': `${policy.tapTargetPx}px`,
    '--hud-control-size': `${controlSize}px`,
    '--hud-gutter': `${HUD_LAYOUT_CONFIG.GUTTER_PX[policy.density]}px`,
    '--hud-gap': `${HUD_LAYOUT_CONFIG.GAP_PX}px`,
  } as CSSProperties;
}
