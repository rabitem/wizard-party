import type { IPlayer } from '@shared/domain';
import { SCENE_LABEL } from '../../config/scene-label.config';
import { CARD_HEIGHT, CARD_THICKNESS } from '../../utils/card-texture';
import { shortenName } from '../table/seat-nameplate';

/** Gap between the card's top edge and the chip's anchor (card-local y) */
const BADGE_GAP_FROM_CARD = 0.08;
/** The chip hovers above the card face (card-local z points away from the face) */
const BADGE_Z = CARD_THICKNESS / 2 + SCENE_LABEL.OWNER_BADGE.LIFT;

export interface PlayedCardOwnerBadgeLayout {
  /** Anchor of the camera-facing owner chip, in the played card's local space */
  badgePosition: [number, number, number];
}

export function getPlayedCardOwnerBadgeLayout(): PlayedCardOwnerBadgeLayout {
  return {
    badgePosition: [0, CARD_HEIGHT / 2 + BADGE_GAP_FROM_CARD, BADGE_Z],
  };
}

/** Name on the owner chip: YOU for the local player, otherwise a short first name */
export function getOwnerBadgeLabel(player: Pick<IPlayer, 'name'>, isLocalPlayer: boolean): string {
  return isLocalPlayer ? 'YOU' : shortenName(player.name, SCENE_LABEL.OWNER_BADGE.MAX_NAME_CHARS);
}
