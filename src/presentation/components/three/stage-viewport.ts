import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { CAMERA_CONFIG } from '../../config/layout.config';
import { useHudInsets } from '../../hooks/layout';
import type { HudInsets } from '../../types/hud-layout.types';

/**
 * The part of the canvas the table is framed in: the canvas minus the side docks the HUD keeps
 * open (standings on the left or right). Top and bottom bars are not taken out; the portrait
 * framing reserves those bands itself (CAMERA_CONFIG.FRAMING.PORTRAIT_RESERVE).
 */
export interface StageViewport {
  /** Free width in CSS px */
  width: number;
  height: number;
  /** Shift of the projection centre to the middle of the free width, in CSS px (positive: left) */
  offsetX: number;
}

export function getStageViewport(size: { width: number; height: number }, insets: HudInsets): StageViewport {
  const covered = insets.left + insets.right;
  const maxCovered = size.width * (1 - CAMERA_CONFIG.FRAMING.MIN_STAGE_WIDTH_FRACTION);
  // Docks wider than allowed give up space in proportion, so the stage never collapses.
  const scale = covered > maxCovered && covered > 0 ? maxCovered / covered : 1;
  const left = insets.left * scale;
  const right = insets.right * scale;
  const width = size.width - left - right;
  return { width, height: size.height, offsetX: size.width / 2 - (left + width / 2) };
}

/** The stage of the game canvas, following its size and the HUD's insets. */
export function useStageViewport(): StageViewport {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const insets = useHudInsets();
  return useMemo(() => getStageViewport({ width, height }, insets), [width, height, insets]);
}
