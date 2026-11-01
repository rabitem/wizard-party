import type { HudButtonDecorProps, HudPanelDecorProps } from '../hud-skin.types';
import { PixelArt } from './pixel-icons';
import styles from './pixel.module.css';

/** Corner positions; each class mirrors the top-left sprite into its corner. */
const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;
type Corner = (typeof CORNERS)[number];

/** A stepped 4x4 corner bracket for buttons (top-left orientation). */
const BUTTON_CORNER = ['..WW', '.W..', 'W...', 'W...'];

/** A chunky stepped 8x8 corner for panels (top-left orientation). */
const PANEL_CORNER = [
  '....WWWW',
  '..WWWWWW',
  '.WWW....',
  '.WW.....',
  'WW......',
  'WW......',
  'WW......',
  'WW......',
];

/** A spinning-coin sprite with a slot down the middle. */
const COIN = ['.KKKK.', 'KYYYYK', 'KYWyYK', 'KYWyYK', 'KYWyYK', 'KYYYyK', '.KKKK.'];

/** A 7x7 pixel star. */
const STAR = ['...Y...', '..YYY..', 'YYYWYYY', '.YYYYY.', '..YyY..', '.YY.YY.', '.Y...Y.'];

/** Coin positions along the standings bottom, as % of the panel width. */
const COIN_POSITIONS = [14, 32, 50, 68, 86];

/** One mirrored corner sprite; `size` is the sprite's width in pixels-of-the-map. */
function CornerSprite({ rows, corner, className }: { rows: readonly string[]; corner: Corner; className: string }) {
  const size = rows[0].length;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className={`${className} ${styles[corner]}`}>
      <PixelArt rows={rows} cell={1} />
    </svg>
  );
}

/** 8-bit bevel with stepped pixel corner brackets that tuck in on hover. */
export function PixelButtonDecor({ variant }: HudButtonDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={variant === 'bid' ? styles.bevelThin : styles.bevel} />
      {CORNERS.map((corner) => (
        <CornerSprite key={corner} rows={BUTTON_CORNER} corner={corner} className={styles.buttonCorner} />
      ))}
    </span>
  );
}

/** A row of pixel coins along the bottom edge of the standings panel. */
function CoinRow({ contained }: { contained: boolean }) {
  return (
    <>
      {COIN_POSITIONS.map((left, index) => (
        <svg
          key={left}
          viewBox="0 0 6 7"
          shapeRendering="crispEdges"
          className={contained ? styles.coinContained : styles.coin}
          style={{ left: `${left}%`, animationDelay: `${index * 0.25}s` }}
        >
          <PixelArt rows={COIN} cell={1} />
        </svg>
      ))}
    </>
  );
}

/** A blinking pixel star on the bid picker. */
function BlinkStar({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 7 7" shapeRendering="crispEdges" className={contained ? styles.starContained : styles.star}>
      <PixelArt rows={STAR} cell={1} />
    </svg>
  );
}

/** Scanlines behind the content, stepped 8-bit frame corners, per-panel extras. */
export function PixelPanelDecor({ variant, contained }: HudPanelDecorProps) {
  const slim = variant === 'status';
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.scanlines} />
      </span>
      {CORNERS.map((corner) => (
        <CornerSprite key={corner} rows={PANEL_CORNER} corner={corner} className={slim ? styles.panelCornerSlim : styles.panelCorner} />
      ))}
      {variant === 'standings' ? <CoinRow contained={contained} /> : null}
      {variant === 'picker' ? <BlinkStar contained={contained} /> : null}
    </>
  );
}

/** A blocky pixel frame with notched corners around the round counter (behind the text). */
export function PixelRoundBadgeDecor() {
  return <span className={styles.roundFrame} />;
}
