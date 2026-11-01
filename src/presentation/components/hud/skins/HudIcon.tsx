'use client';

import type { HudIconComponent, HudIconId } from './hud-skin.types';
import { useHudSkin } from './useHudSkin';

interface HudIconProps {
  id: HudIconId;
  /** The default (lucide) icon, rendered when the active skin has no replacement. */
  fallback: HudIconComponent;
  className?: string;
}

/**
 * A HUD glyph: the active skin's icon for `id`, else `fallback`.
 * Always `relative`, so it paints above a <HudButtonDecor> rendered before it.
 */
export function HudIcon({ id, fallback, className = '' }: HudIconProps) {
  const Icon = useHudSkin().icons?.[id] ?? fallback;
  return <Icon className={`relative ${className}`} />;
}
