import type { CSSProperties } from 'react';
import { PIXEL_PALETTE as C } from '@/presentation/components/hud/skins/pixel/pixel-palette';
import type { LobbyEmptySlotDecorProps, LobbySeatDecorProps } from '../lobby-skin.types';
import { ARROW_RIGHT, PixelSprite } from './pixel-lobby-icons';
import styles from './pixel-lobby.module.css';

/** Player colours like a console's 1P/2P/3P... controllers: [main, dark]. */
const SEAT_COLORS: readonly (readonly [string, string])[] = [
  [C.red, C.redDark],
  [C.blue, C.blueDark],
  [C.green, C.greenDark],
  [C.yellow, C.yellowDark],
  [C.gray, C.grayDark],
  ['#c86bff', '#6d2a9e'],
];

function seatVars(index: number): CSSProperties {
  const [main, dark] = SEAT_COLORS[index % SEAT_COLORS.length];
  return { '--seat': main, '--seat-dark': dark } as CSSProperties;
}

/** A "player select" slot: blocky stepped border, scanlines, a #P tag and a cursor for you. */
export function PixelPlayerSlotDecor({ index, isLocal }: LobbySeatDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={seatVars(index)}>
      <span className={isLocal ? styles.slotFillLocal : styles.slotFill} />
      <span className={isLocal ? styles.slotBorderLocal : styles.slotBorder} />
      <span className={styles.slotTag}>{index + 1}P</span>
      {isLocal ? <PixelSprite rows={ARROW_RIGHT} className={styles.cursor} /> : null}
    </span>
  );
}

/** A pixel frame with stepped corners around the avatar, in the seat's colour. */
export function PixelAvatarFrame({ index, isLocal }: LobbySeatDecorProps) {
  return (
    <span className={isLocal ? styles.avatarFrameLocal : styles.avatarFrame} style={seatVars(index)}>
      <span className={styles.avatarSteps} />
    </span>
  );
}

/** A free slot: dim dashed border and a blinking "PRESS START" prompt at the right. */
export function PixelEmptySlotDecor({ index }: LobbyEmptySlotDecorProps) {
  return (
    <>
      <span className={styles.emptyBorder} />
      <span className={styles.pressStart} style={{ animationDelay: `${-(index % 3) * 0.3}s` }}>
        Press Start
      </span>
    </>
  );
}
