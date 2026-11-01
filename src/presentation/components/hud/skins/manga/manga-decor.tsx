import type { CSSProperties } from 'react';
import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { burstPath } from './manga-icons';
import { MANGA_PALETTE as C } from './manga-palette';
import styles from './manga.module.css';

/** Width of the bold ink outline per button kind, in px. */
const INK_WIDTH: Record<HudButtonVariant, number> = { icon: 2, tile: 3, fab: 2.5, bid: 2 };

/** Tapered brush strokes for the panel edges (viewBox 0 0 200 8, stretched to the panel width). */
const BRUSH_TOP = 'M0 4.4Q12 1.6 46 2.4T120 2.2Q168 1.4 200 3.2L199 4.6Q160 5.6 112 4.8T34 5.4Q10 5.8 0 4.4Z';
const BRUSH_BOTTOM = 'M0 3.6Q30 2 82 3T160 2.6Q186 2.4 200 4.2Q182 5.8 140 5.2T50 5.6Q16 5.8 0 3.6Z';
/** A short vertical brush stroke down the left edge (viewBox 0 0 8 100). */
const BRUSH_SIDE = 'M3.4 0Q5 20 4.4 52T4.8 100H3.2Q2.6 70 3 46T2.4 0Z';

const SFX_BURST = burstPath(12, 11, [11.4, 10.4], [7.6, 6.8], 11);

/** Bold ink outline with a paper hairline inside, plus a halftone dot corner. */
export function MangaButtonDecor({ variant }: HudButtonDecorProps) {
  const ink = { '--manga-ink': `${INK_WIDTH[variant]}px` } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={ink}>
      <span className={styles.clip}>
        <span className={`${styles.halftoneCorner} opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />
      </span>
      <span className={styles.inkOutline} />
    </span>
  );
}

/** A brush stroke stretched along one edge of the panel. */
function BrushEdge({ d, className, viewBox }: { d: string; className: string; viewBox: string }) {
  return (
    <svg viewBox={viewBox} preserveAspectRatio="none" className={className}>
      <path d={d} fill={C.paper} />
    </svg>
  );
}

/** A sound-effect burst with a bold "!" (drawn as shapes, no text). */
function SfxBurst({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 24 22" className={contained ? styles.sfxContained : styles.sfx}>
      <path d={SFX_BURST} fill={C.yellow} stroke={C.ink} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M10.6 5.4H13.6L12.9 12.6H11.3Z" fill={C.red} stroke={C.ink} strokeWidth={0.8} strokeLinejoin="round" />
      <circle cx={12.1} cy={15.4} r={1.5} fill={C.red} stroke={C.ink} strokeWidth={0.8} />
    </svg>
  );
}

/** Screentone and speed lines behind the content, brush-stroke edges on top, per-panel extras. */
export function MangaPanelDecor({ variant, contained }: HudPanelDecorProps) {
  const slim = variant === 'status';
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.screentone} />
        {slim ? null : <span className={styles.speedLines} />}
      </span>
      <span className={styles.clip}>
        <BrushEdge d={BRUSH_TOP} viewBox="0 0 200 8" className={slim ? styles.brushTopSlim : styles.brushTop} />
        {slim ? null : <BrushEdge d={BRUSH_BOTTOM} viewBox="0 0 200 8" className={styles.brushBottom} />}
        {slim ? null : <BrushEdge d={BRUSH_SIDE} viewBox="0 0 8 100" className={styles.brushSide} />}
      </span>
      {variant === 'picker' ? <SfxBurst contained={contained} /> : null}
    </>
  );
}

/** A red hanko seal circle stamped behind the round counter. */
export function MangaRoundBadgeDecor() {
  return <span className={styles.hanko} />;
}
