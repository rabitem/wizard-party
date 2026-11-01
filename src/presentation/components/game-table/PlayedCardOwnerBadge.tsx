'use client';

import { IPlayer } from '@shared/domain';
import { SCENE_LABEL } from '../../config/scene-label.config';
import { SceneText } from '../three/SceneText';
import { ScreenSizedBillboard } from '../three/ScreenSizedBillboard';
import { getOwnerBadgeLabel, getPlayedCardOwnerBadgeLayout } from './played-card-owner-badge-layout';

const OWNER_BADGE_COLORS = [
  '#d4a84b',
  '#5aa9e6',
  '#4ade80',
  '#f87171',
  '#c084fc',
  '#f59e0b',
] as const;

const { OWNER_BADGE, FONT_SIZE, CAP_HEIGHT_RATIO, COLORS } = SCENE_LABEL;
/** Gap between the play-order dot and the name, in font sizes */
const NAME_GAP = 0.35;

interface PlayedCardOwnerBadgeProps {
  player: IPlayer;
  playerIndex: number;
  playOrder: number;
  isLocalPlayer: boolean;
}

function getBadgeColor(playerIndex: number): string {
  return OWNER_BADGE_COLORS[playerIndex % OWNER_BADGE_COLORS.length];
}

/**
 * Who played this card: a camera-facing chip (seat-coloured play-order dot plus name) of
 * constant on-screen size, hovering just past the card's top edge. It is depth-tested, so a
 * card that lands on top of it covers it.
 */
export function PlayedCardOwnerBadge({
  player,
  playerIndex,
  playOrder,
  isLocalPlayer,
}: PlayedCardOwnerBadgeProps) {
  const layout = getPlayedCardOwnerBadgeLayout();
  const badgeColor = getBadgeColor(playerIndex);

  return (
    <ScreenSizedBillboard
      position={layout.badgePosition}
      contentHeight={FONT_SIZE * CAP_HEIGHT_RATIO}
      targetPx={OWNER_BADGE.CAP_PX}
    >
      <mesh>
        <circleGeometry args={[OWNER_BADGE.DOT_RADIUS, 20]} />
        <meshBasicMaterial color={badgeColor} toneMapped={false} />
      </mesh>
      <SceneText
        position={[0, 0, 0.002]}
        fontSize={FONT_SIZE}
        color={COLORS.OUTLINE}
        anchorX="center"
        anchorY="middle"
        fontWeight={800}
      >
        {String(playOrder + 1)}
      </SceneText>
      <SceneText
        position={[OWNER_BADGE.DOT_RADIUS + FONT_SIZE * NAME_GAP, 0, 0.002]}
        fontSize={FONT_SIZE}
        color={isLocalPlayer ? COLORS.LOCAL : COLORS.TEXT}
        outlineWidth={OWNER_BADGE.OUTLINE_WIDTH}
        outlineColor={COLORS.OUTLINE}
        anchorX="left"
        anchorY="middle"
        fontWeight={700}
      >
        {getOwnerBadgeLabel(player, isLocalPlayer)}
      </SceneText>
    </ScreenSizedBillboard>
  );
}
