import type { CSSProperties } from 'react';
import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { NEON_PALETTE as C } from './neon-palette';
import styles from './neon.module.css';

/** Thickness of the neon outline tube per button kind, in px. */
const TUBE_WIDTH: Record<HudButtonVariant, number> = { icon: 1.5, tile: 2, fab: 2, bid: 1.5 };

/** Mounting clip positions along each panel tube, as % of the panel width. */
const CLIP_POSITIONS = [16, 84];

/** Neon outline tube with a soft inner glow; flickers now and then (static under reduced motion). */
export function NeonButtonDecor({ variant }: HudButtonDecorProps) {
  const tube = { '--neon-tube': `${TUBE_WIDTH[variant]}px` } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={tube}>
      <span className={`${styles.tubeOutline} opacity-80 transition-opacity duration-300 group-hover:opacity-100`} />
    </span>
  );
}

/** A straight neon tube along one panel edge, held by small mounting clips. */
function EdgeTube({ edge, contained }: { edge: 'top' | 'bottom'; contained: boolean }) {
  const tubeClass = edge === 'top' ? styles.tubeTop : styles.tubeBottom;
  const clipClass = edge === 'top' ? styles.mountTop : styles.mountBottom;
  const insetClass = contained ? styles.insetContained : '';
  return (
    <>
      <span className={`${tubeClass} ${insetClass}`} />
      {CLIP_POSITIONS.map((left) => (
        <span key={left} className={`${clipClass} ${insetClass}`} style={{ left: `${left}%` }} />
      ))}
    </>
  );
}

/** A small glowing sign: a striped synthwave sun setting behind a palm tree. */
function PalmSunSign({ contained }: { contained: boolean }) {
  return (
    <svg
      viewBox="0 0 28 22"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={contained ? styles.signContained : styles.sign}
    >
      <path d="M4 16A10 10 0 0 1 24 16Z" stroke={C.orange} strokeWidth={1.4} />
      <path d="M5.4 12.6H22.6M7.2 9.6H20.8" stroke={C.pink} strokeWidth={1} />
      <path d="M2 19.2H26" stroke={C.pink} strokeWidth={1.4} />
      <path d="M19.6 19Q20.4 13.6 17.6 8" stroke={C.cyan} strokeWidth={1.3} />
      <path
        d="M17.6 8Q13.4 6.2 11.2 8.8M17.6 8Q15.4 4.2 12.6 3.6M17.6 8Q19.8 4 23.4 4.4M17.6 8Q22 7.2 24.8 10.2"
        stroke={C.cyan}
        strokeWidth={1.2}
      />
      <path d="M2 19.2H26M17.6 8Q15.4 4.2 12.6 3.6" stroke={C.core} strokeWidth={0.8} opacity={0.5} />
    </svg>
  );
}

/** Faint horizon grid behind the content, neon tubes along the edges, a sign on the picker. */
export function NeonPanelDecor({ variant, contained }: HudPanelDecorProps) {
  const slim = variant === 'status';
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.horizonGlow} />
        {slim ? null : <span className={styles.grid} />}
      </span>
      {slim ? (
        <span className={styles.clip}>
          <span className={styles.tubeTopSlim} />
        </span>
      ) : (
        <>
          <EdgeTube edge="top" contained={contained} />
          <EdgeTube edge="bottom" contained={contained} />
        </>
      )}
      {variant === 'picker' ? <PalmSunSign contained={contained} /> : null}
    </>
  );
}

/** A glowing neon ring around the round counter (behind the text). */
export function NeonRoundBadgeDecor() {
  return <span className={styles.ring} />;
}
