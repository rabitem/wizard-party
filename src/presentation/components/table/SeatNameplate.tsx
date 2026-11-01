'use client';

import type { IPlayer } from '@shared/domain';
import { SCENE_LABEL } from '../../config/scene-label.config';
import { SceneText } from '../three/SceneText';
import { ScreenSizedBillboard } from '../three/ScreenSizedBillboard';
import { getSeatLabelAnchor, getSeatLabelPosition, getSeatLabelText } from './seat-nameplate';

interface SeatNameplateProps {
  /** Brandmark position on the rim (table space) */
  brandmarkPosition: [number, number, number];
  player: IPlayer;
  isCurrentTurn: boolean;
  isLocalPlayer: boolean;
}

function labelColor(isCurrentTurn: boolean, isLocalPlayer: boolean): string {
  if (isCurrentTurn) return SCENE_LABEL.COLORS.TURN;
  return isLocalPlayer ? SCENE_LABEL.COLORS.LOCAL : SCENE_LABEL.COLORS.TEXT;
}

/**
 * Seat name and bid progress as a camera-facing label of constant on-screen size (>= 11 px on
 * every device), floating over the seat. Depth-tested like any other object.
 */
export function SeatNameplate({ brandmarkPosition, player, isCurrentTurn, isLocalPlayer }: SeatNameplateProps) {
  return (
    <ScreenSizedBillboard
      position={getSeatLabelPosition(brandmarkPosition)}
      contentHeight={SCENE_LABEL.FONT_SIZE * SCENE_LABEL.CAP_HEIGHT_RATIO}
      targetPx={SCENE_LABEL.SEAT.CAP_PX}
    >
      <SceneText
        fontSize={SCENE_LABEL.FONT_SIZE}
        color={labelColor(isCurrentTurn, isLocalPlayer)}
        outlineWidth={SCENE_LABEL.SEAT.OUTLINE_WIDTH}
        outlineColor={SCENE_LABEL.COLORS.OUTLINE}
        anchorX={getSeatLabelAnchor(brandmarkPosition[0])}
        anchorY="middle"
        fontWeight={isCurrentTurn ? 800 : 700}
      >
        {getSeatLabelText(player, isLocalPlayer)}
      </SceneText>
    </ScreenSizedBillboard>
  );
}
