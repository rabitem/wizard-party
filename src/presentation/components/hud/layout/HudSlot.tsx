'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { HudRegion } from '@/presentation/types/hud-layout.types';
import { useHudRegionNode } from './hud-regions-context';

interface HudSlotProps {
  region: HudRegion;
  /** Position inside the region (lower first); see HUD_SLOT_ORDER */
  order: number;
  /** false for purely informative content that must not swallow pointer input to the table */
  interactive?: boolean;
  children: ReactNode;
}

/**
 * Renders its children into a named HUD region. Regions never overlap, so content placed
 * through slots cannot collide with other HUD panels; the region applies edge gutters and
 * safe-area insets. Renders nothing outside a HudLayout.
 */
export function HudSlot({ region, order, interactive = true, children }: HudSlotProps) {
  const node = useHudRegionNode(region);
  if (!node) return null;
  return createPortal(
    <div
      className={`hud-slot ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{ order }}
      data-hud-slot={region}
    >
      {children}
    </div>,
    node,
  );
}
