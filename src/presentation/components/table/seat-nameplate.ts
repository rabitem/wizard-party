import type { IPlayer } from '@shared/domain';
import { SCENE_LABEL } from '../../config/scene-label.config';

export type LabelAnchorX = 'left' | 'center' | 'right';

/** Shorten a name to a label length (first word, ellipsis when cut) */
export function shortenName(name: string, maxChars: number, fallback = 'Player'): string {
  const first = name.trim().split(/\s+/)[0] || fallback;
  return first.length > maxChars ? `${first.slice(0, maxChars - 1)}…` : first;
}

/** Bid progress: "tricks/bid" once the player has bid, a dash before */
function getBidProgressText(player: Pick<IPlayer, 'bid' | 'tricksWon'>): string {
  const hasBid = player.bid !== null && player.bid !== undefined;
  return hasBid ? `${player.tricksWon ?? 0}/${player.bid}` : '–';
}

/** One-line seat label: who sits there and how their bid is going */
export function getSeatLabelText(player: Pick<IPlayer, 'name' | 'bid' | 'tricksWon'>, isLocalPlayer: boolean): string {
  const name = isLocalPlayer ? 'You' : shortenName(player.name, SCENE_LABEL.SEAT.MAX_NAME_CHARS);
  return `${name}  ${getBidProgressText(player)}`;
}

/**
 * Side seats sit at the screen edge: their label grows toward the table centre (a right-hand
 * seat anchors its label's right edge), so it never runs off screen.
 */
export function getSeatLabelAnchor(seatX: number): LabelAnchorX {
  if (seatX > SCENE_LABEL.SEAT.SIDE_ANCHOR_X) return 'right';
  if (seatX < -SCENE_LABEL.SEAT.SIDE_ANCHOR_X) return 'left';
  return 'center';
}

/** Label anchor in table space: lifted above the rim and pulled toward the table centre */
export function getSeatLabelPosition(brandmarkPosition: readonly [number, number, number]): [number, number, number] {
  const [x, y, z] = brandmarkPosition;
  const radius = Math.hypot(x, z) || 1;
  const inward = SCENE_LABEL.SEAT.INWARD / radius;
  return [x - x * inward, y + SCENE_LABEL.SEAT.LIFT, z - z * inward];
}
