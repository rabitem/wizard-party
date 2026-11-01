import type { CSSProperties } from 'react';
import { PIXEL_PALETTE as C } from '@/presentation/components/hud/skins/pixel/pixel-palette';
import type { LobbyPanelDecorProps, LobbyPanelVariant, LobbyStartDecorProps } from '../lobby-skin.types';
import { ARROW_LEFT, ARROW_RIGHT, COIN, PixelSprite, ROBOT } from './pixel-lobby-icons';
import styles from './pixel-lobby.module.css';

/** Border colour per panel. */
const BORDERS: Record<LobbyPanelVariant, string> = {
  count: C.yellow,
  players: C.blue,
  rules: C.green,
  actions: C.gray,
};

/** Scanlines and a faint pixel grid behind every panel; the actions bar gets a brick floor. */
export function PixelPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.brickFloor} />;
  return <span className={styles.panelScanlines} />;
}

/** A stepped pixel border with a drop shadow; coins sit on the count, players and rules panels. */
export function PixelPanelDecor({ variant }: LobbyPanelDecorProps) {
  const vars = { '--px': BORDERS[variant] } as CSSProperties;
  if (variant === 'actions') return <span className={styles.actionsEdge} style={vars} />;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={vars}>
      <span className={styles.panelBorder} />
      <PixelSprite rows={COIN} className={styles.coinA} />
      {variant === 'players' ? <PixelSprite rows={COIN} className={styles.coinB} /> : null}
    </span>
  );
}

/** The add-bot row: a pixel robot hops in from the right and keeps bouncing; a +CPU tag. */
export function PixelAddBotDecor() {
  return (
    <>
      <span className={styles.cpuBorder} />
      <span className={styles.cpuTag}>+CPU</span>
      <span className={styles.robotHop}>
        <PixelSprite rows={ROBOT} className={styles.robot} />
      </span>
    </>
  );
}

/**
 * The start button as a chunky arcade key: a raised face over a dark base when ready (it
 * presses itself now and then, blinking cursors at both ends), pressed and grey while waiting,
 * a dim key with loading dots for guests.
 */
export function PixelStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.keyBaseIdle} />
        <span className={styles.keyFaceIdle} />
        <span className={styles.loadingDots}>
          <span />
          <span />
          <span />
        </span>
      </>
    );
  }
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.keyBase : styles.keyBaseIdle} />
      <span className={ready ? styles.keyFace : styles.keyFacePressed} />
      {ready ? (
        <>
          <PixelSprite rows={ARROW_RIGHT} className={styles.keyCursorLeft} />
          <PixelSprite rows={ARROW_LEFT} className={styles.keyCursorRight} />
        </>
      ) : null}
    </>
  );
}
