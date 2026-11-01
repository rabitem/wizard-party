import type { CSSProperties } from 'react';
import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { SUMMER_PALETTE as C } from './summer-palette';
import styles from './summer.module.css';

/** Width of the mosaic rim per button kind, in px. */
const RIM_WIDTH: Record<HudButtonVariant, number> = { icon: 3, tile: 4, fab: 3, bid: 2 };

/** Float positions along the standings rope, as % of the panel width. */
const ROPE_FLOATS = [18, 50, 82];

/** A water droplet that slides onto the rim while the (group) button is hovered. */
function Droplet() {
  return (
    <svg
      viewBox="0 0 6 8"
      className="absolute top-0 right-[5px] w-[6px] h-[8px] opacity-0 transition-[opacity,transform] duration-500 group-hover:opacity-100 motion-safe:group-hover:translate-y-[2px]"
    >
      <path d="M3 .5C3 .5.7 3.6.7 5.2a2.3 2.3 0 0 0 4.6 0C5.3 3.6 3 .5 3 .5Z" fill={C.foam} stroke={C.water} strokeWidth={0.5} />
      <circle cx={2.2} cy={5} r={0.55} fill="#ffffff" />
    </svg>
  );
}

/** Mosaic pool-tile rim with a thin wet highlight and a droplet on hover. */
export function SummerButtonDecor({ variant }: HudButtonDecorProps) {
  const rim = { '--summer-rim': `${RIM_WIDTH[variant]}px` } as CSSProperties;
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={rim}>
      <span className={styles.tileRim} />
      <span className={styles.wetGloss} />
      <Droplet />
    </span>
  );
}

/** A red/white float threaded on the rope. */
function RopeFloat({ left, contained }: { left: number; contained: boolean }) {
  return (
    <svg viewBox="0 0 14 8" className={contained ? styles.floatContained : styles.float} style={{ left: `${left}%` }}>
      <ellipse cx={7} cy={4} rx={6.4} ry={3.4} fill={C.red} />
      <rect x={5.2} y={0.9} width={3.6} height={6.2} fill={C.white} />
      <ellipse cx={7} cy={4} rx={6.4} ry={3.4} stroke={C.outline} strokeWidth={0.6} fill="none" />
      <path d="M3 2.4Q7 1 11 2.4" stroke="#ffffff" strokeWidth={0.6} opacity={0.6} fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Rope with floats along the bottom edge (a pool lane line). */
function BuoyRope({ contained }: { contained: boolean }) {
  return (
    <>
      <span className={contained ? styles.ropeContained : styles.rope} />
      {ROPE_FLOATS.map((left) => <RopeFloat key={left} left={left} contained={contained} />)}
    </>
  );
}

/** A rubber duck sitting on the pool edge. */
function RubberDuck({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 22 19" className={contained ? styles.duckContained : styles.duck}>
      <path d="M1 17.4q2.5-1.2 5 0t5 0t5 0t5 0" stroke={C.foam} strokeWidth={0.9} opacity={0.8} fill="none" strokeLinecap="round" />
      <path d="M2.8 12.6L1.3 9.6L5 11.3Z" fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.7} strokeLinejoin="round" />
      <ellipse cx={10} cy={13} rx={7.5} ry={4.2} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
      <path d="M6.5 12.5Q9.5 10.6 12.3 12.6Q9.6 14.6 6.5 12.5Z" fill={C.yellowDark} opacity={0.5} />
      <circle cx={14.6} cy={7} r={3.8} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
      <path d="M18 7.2L21 7.8L18.2 9.2Z" fill={C.orange} stroke={C.orangeDark} strokeWidth={0.5} strokeLinejoin="round" />
      <circle cx={15.6} cy={6.2} r={0.75} fill={C.navy} />
      <circle cx={15.85} cy={5.95} r={0.25} fill="#ffffff" />
    </svg>
  );
}

/** Tiled pool edge on top, caustic light behind the content, plus a per-panel ornament. */
export function SummerPanelDecor({ variant, contained }: HudPanelDecorProps) {
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.caustics} />
      </span>
      <span className={styles.clip}>
        <span className={variant === 'status' ? styles.poolEdgeSlim : styles.poolEdge} />
      </span>
      {variant === 'standings' ? <BuoyRope contained={contained} /> : null}
      {variant === 'picker' ? <RubberDuck contained={contained} /> : null}
    </>
  );
}

/** Red/white life ring around the round counter (behind the text). */
export function SummerRoundBadgeDecor() {
  return <span className={styles.lifeRing} />;
}
