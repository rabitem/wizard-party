import { burstPath } from '@/presentation/components/hud/skins/manga/manga-icons';
import { MANGA_PALETTE as C } from '@/presentation/components/hud/skins/manga/manga-palette';
import type { LobbyPanelDecorProps, LobbyStartDecorProps } from '../lobby-skin.types';
import styles from './manga-lobby.module.css';

/** Screentone dots behind every panel; the actions bar gets horizontal speed lines instead. */
export function MangaPanelBackdrop({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.speedFloor} />;
  return (
    <>
      <span className={styles.screentone} />
      {variant === 'players' || variant === 'count' ? <span className={styles.toneGradient} /> : null}
    </>
  );
}

/** A tapered L-shaped brush stroke for a panel corner (paper ink on the dark surface). */
function BrushCorner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 34 34" className={className}>
      <path
        d="M3 32Q1.5 14 4 5Q12 1.5 32 3Q16 6 9.5 9.5Q6 15 3 32Z"
        fill={C.paper}
        stroke={C.ink}
        strokeWidth={0.9}
        strokeLinejoin="round"
        opacity={0.9}
      />
      <path d="M5.5 26Q5 14 7 7.5Q13 5 25 5" stroke={C.ink} strokeWidth={0.6} fill="none" opacity={0.5} />
      <circle cx={30} cy={7.5} r={1.1} fill={C.paper} opacity={0.8} />
      <circle cx={7} cy={30.5} r={0.8} fill={C.paper} opacity={0.7} />
    </svg>
  );
}

/** A small SFX sticker ("!!") for the players panel. */
const STICKER_BURST = burstPath(20, 14, [19, 13], [13, 8.5], 11);

function SfxSticker() {
  return (
    <svg viewBox="0 0 40 28" className={styles.sticker}>
      <path d={STICKER_BURST} fill={C.yellow} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <path d="M16.5 7.5L15.5 16M23.5 7.5L22.5 16" stroke={C.red} strokeWidth={3} strokeLinecap="round" />
      <circle cx={15.2} cy={20} r={1.7} fill={C.red} />
      <circle cx={22.2} cy={20} r={1.7} fill={C.red} />
    </svg>
  );
}

/** A red hanko seal impression stamped on a corner; `glyph` is abstract brush marks. */
function Hanko({ className, glyph }: { className: string; glyph: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x={2} y={2} width={20} height={20} rx={3} fill={C.paper} opacity={0.92} />
      <rect x={3.6} y={3.6} width={16.8} height={16.8} rx={2} fill="none" stroke={C.red} strokeWidth={1.8} />
      <rect x={3.6} y={3.6} width={16.8} height={16.8} rx={2} fill="none" stroke={C.paper} strokeWidth={0.9} strokeDasharray="1 7" />
      <path d={glyph} stroke={C.red} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** Abstract seal marks (not real characters). */
const GLYPH_A = 'M8 8H16M12 8V16M8.5 12.5H15.5M9 16H15';
const GLYPH_B = 'M8 7.5L16 16.5M16 7.5L12.5 11.5M8 13H11M9.5 13V17';

/** A brush-inked frame: paper outline, two tapered corner strokes, a per-panel accent. */
export function MangaPanelDecor({ variant }: LobbyPanelDecorProps) {
  if (variant === 'actions') return <span className={styles.actionsInk} />;
  return (
    <>
      <span className={styles.panelInk} />
      <BrushCorner className={styles.brushTopLeft} />
      <BrushCorner className={styles.brushBottomRight} />
      {variant === 'players' ? <SfxSticker /> : null}
      {variant === 'count' || variant === 'rules' ? <Hanko className={styles.panelHanko} glyph={variant === 'count' ? GLYPH_A : GLYPH_B} /> : null}
    </>
  );
}

/** The add-bot row as a "NEW RIVAL!" splash: speed lines behind, a slanted burst tag on top. */
const RIVAL_BURST = burstPath(12, 12, [11.5, 11.5], [7, 7], 9);

export function MangaAddBotDecor() {
  return (
    <>
      <span className={styles.rivalLines} />
      <span className={styles.rivalTag}>
        <svg viewBox="0 0 24 24" className={styles.rivalSpark}>
          <path d={RIVAL_BURST} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
        NEW RIVAL!
      </span>
    </>
  );
}

/**
 * The start button as a dramatic ink splash: red focus-line field and brush border when ready,
 * hanko seals stamping both ends; screentone when waiting; drifting speed lines for guests.
 */
export function MangaStartDecor({ mode }: LobbyStartDecorProps) {
  if (mode === 'guest') {
    return (
      <>
        <span className={styles.startTone} />
        <span className={styles.guestLines} />
      </>
    );
  }
  const ready = mode === 'ready';
  return (
    <>
      <span className={ready ? styles.startInk : styles.startTone} />
      {ready ? <span className={styles.startFocus} /> : null}
      <span className={ready ? styles.startBrush : styles.startBrushDim} />
      <Hanko className={ready ? styles.stampLeft : styles.stampLeftDim} glyph={GLYPH_A} />
      <Hanko className={ready ? styles.stampRight : styles.stampRightDim} glyph={GLYPH_B} />
    </>
  );
}
