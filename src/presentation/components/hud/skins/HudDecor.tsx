'use client';

import type { HudButtonVariant, HudPanelVariant } from './hud-skin.types';
import { useHudSkin } from './useHudSkin';

/** Shared wrapper: decorative, click-through, fills the host and follows its radius. */
const DECOR_ROOT_CLASS = 'pointer-events-none absolute inset-0 rounded-[inherit]';

/**
 * Skin decoration inside a HUD button. Place it after the button's frame and before its
 * icon/label (which must be `relative`, e.g. <HudIcon>). Renders nothing without a skin.
 */
export function HudButtonDecor({ variant = 'icon' }: { variant?: HudButtonVariant }) {
  const { ButtonDecor } = useHudSkin();
  if (!ButtonDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <ButtonDecor variant={variant} />
    </span>
  );
}

/**
 * Skin decoration inside a HUD panel. The host must be `relative isolate` (isolate lets the skin
 * paint background motifs behind the content). Renders nothing without a skin.
 */
export function HudPanelDecor({ variant, contained = false }: { variant: HudPanelVariant; contained?: boolean }) {
  const { PanelDecor } = useHudSkin();
  if (!PanelDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <PanelDecor variant={variant} contained={contained} />
    </span>
  );
}

/**
 * Skin decoration around the round counter. The host must be `relative`, inside a stacking
 * context (the status bar is `isolate`). Renders nothing without a skin.
 */
export function HudRoundBadgeDecor() {
  const { RoundBadgeDecor } = useHudSkin();
  if (!RoundBadgeDecor) return null;
  return (
    <span aria-hidden="true" className={DECOR_ROOT_CLASS}>
      <RoundBadgeDecor />
    </span>
  );
}
