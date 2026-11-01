import type { CSSProperties } from 'react';
import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { Leaf } from './solarpunk-icons';
import { SOLARPUNK_PALETTE as C } from './solarpunk-palette';
import styles from './solarpunk.module.css';

/** Edge length of the brass corner fittings per button kind, in px. */
const CORNER_SIZE: Record<HudButtonVariant, number> = { icon: 7, tile: 9, fab: 7, bid: 5 };

/** Size of the leaf tucked into the bottom-left corner per button kind, in px. */
const CORNER_LEAF: Record<HudButtonVariant, number> = { icon: 9, tile: 12, fab: 10, bid: 7 };

const CORNERS = [
  { id: 'tl', className: styles.cornerTl },
  { id: 'tr', className: styles.cornerTr },
  { id: 'br', className: styles.cornerBr },
  { id: 'bl', className: styles.cornerBl },
];

/** Ivy strands hanging from the top edge: position (% of width) and length (px). */
const IVY_STANDINGS = [
  { left: 7, length: 14 },
  { left: 30, length: 7 },
  { left: 70, length: 9 },
  { left: 93, length: 15 },
];
const IVY_CHAT = [
  { left: 8, length: 10 },
  { left: 92, length: 8 },
];

/** Brass L-fittings with rivets on every corner and a small leaf that perks up on hover. */
export function SolarpunkButtonDecor({ variant }: HudButtonDecorProps) {
  const vars = { '--sp-corner': `${CORNER_SIZE[variant]}px` } as CSSProperties;
  const leaf = CORNER_LEAF[variant];
  return (
    <span className="absolute inset-0 rounded-[inherit]" style={vars}>
      <span className={styles.glassSheen} />
      {CORNERS.map((corner) => <span key={corner.id} className={corner.className} />)}
      <svg
        viewBox="0 0 10 10"
        className="absolute bottom-[1px] left-[1px] origin-bottom-left transition-transform duration-500 motion-safe:group-hover:-rotate-12"
        style={{ width: leaf, height: leaf }}
      >
        <Leaf x={2} y={9} length={7.4} angle={40} />
      </svg>
    </span>
  );
}

/** A three-lobed ivy leaf hanging from the origin. */
const IVY_LEAF = 'M0 0C-1.6-.4-3-.2-3.4 1.2C-2.6 1.4-2.2 2-2.4 2.8C-1.4 2.6-.6 3.2 0 4.4'
  + 'C.6 3.2 1.4 2.6 2.4 2.8C2.2 2 2.6 1.4 3.4 1.2C3-.2 1.6-.4 0 0Z';

/** One ivy strand of `length` px hanging from the top edge, leaves alternating sides. */
function IvyStrand({ left, length }: { left: number; length: number }) {
  const leaves: number[] = [];
  for (let y = 2; y < length; y += 4.5) leaves.push(y);
  return (
    <svg viewBox={`0 0 10 ${length + 5}`} className={styles.ivy} style={{ left: `${left}%`, height: length + 5 }}>
      <path d={`M5 0Q6.4 ${length / 2} 5 ${length}`} stroke={C.leafDark} strokeWidth={0.8} fill="none" />
      {leaves.map((y, i) => (
        <path
          key={y}
          d={IVY_LEAF}
          fill={i % 2 === 0 ? C.leaf : C.fern}
          stroke={C.leafDark}
          strokeWidth={0.5}
          transform={`translate(5.4 ${y}) rotate(${i % 2 === 0 ? 35 : -35})`}
        />
      ))}
      <path d={IVY_LEAF} fill={C.leafLight} stroke={C.leafDark} strokeWidth={0.5} transform={`translate(5 ${length})`} />
    </svg>
  );
}

/** Ivy vine running along the top edge with strands hanging down. */
function HangingIvy({ strands, contained }: { strands: { left: number; length: number }[]; contained: boolean }) {
  return (
    <span className={contained ? styles.ivyRowContained : styles.ivyRow}>
      <span className={styles.ivyVine} />
      {strands.map((s) => <IvyStrand key={s.left} left={s.left} length={s.length} />)}
    </span>
  );
}

/** Points along a quadratic curve with alternating fern leaflets. */
function frondLeaflets(p0: [number, number], p1: [number, number], p2: [number, number], count: number) {
  const out: { x: number; y: number; angle: number; length: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const heading = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    const length = 3.4 * (1 - t * 0.6);
    out.push({ x, y, angle: heading - 60, length }, { x, y, angle: heading + 60, length });
  }
  return out;
}

const FRONDS: [number, number][][] = [
  [[10, 16], [9.6, 9], [10.8, 2]],
  [[9.4, 16], [6, 10.4], [1.6, 10.6]],
  [[10.6, 16], [14.2, 10.4], [18.4, 10]],
];

/** A potted fern in a brass pot on the picker corner. */
function PottedFern({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 20 24" className={contained ? styles.fernContained : styles.fern}>
      {FRONDS.map(([p0, p1, p2]) => (
        <g key={`${p2[0]}`}>
          <path d={`M${p0[0]} ${p0[1]}Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`} stroke={C.leafDark} strokeWidth={0.8} fill="none" />
          {frondLeaflets(p0, p1, p2, 5).map((l) => (
            <path
              key={`${l.x.toFixed(2)}-${l.angle.toFixed(0)}`}
              d={`M0 0C-1.1-.8-1-${(l.length * 0.8).toFixed(2)} 0-${l.length.toFixed(2)}C1-${(l.length * 0.8).toFixed(2)} 1.1-.8 0 0Z`}
              fill={C.fern}
              transform={`translate(${l.x.toFixed(2)} ${l.y.toFixed(2)}) rotate(${l.angle.toFixed(1)})`}
            />
          ))}
        </g>
      ))}
      <path d="M5 16.6H15L14 23.2H6Z" fill={C.brass} stroke={C.brassDark} strokeWidth={0.7} />
      <rect x={4.2} y={15.4} width={11.6} height={2.2} rx={0.6} fill={C.brassLight} stroke={C.brassDark} strokeWidth={0.7} />
      <path d="M7 18.6V22" stroke="#ffffff" strokeWidth={0.6} opacity={0.5} />
    </svg>
  );
}

/** Leaf veins behind the content, ivy on top, a riveted brass rail below, plus per-panel ornaments. */
export function SolarpunkPanelDecor({ variant, contained }: HudPanelDecorProps) {
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.veins} />
      </span>
      {variant === 'standings' ? <HangingIvy strands={IVY_STANDINGS} contained={contained} /> : null}
      {variant === 'chat' ? <HangingIvy strands={IVY_CHAT} contained={contained} /> : null}
      {variant === 'status'
        ? <span className={contained ? styles.railSlimContained : styles.railSlim} />
        : <span className={contained ? styles.railContained : styles.rail} />}
      {variant === 'picker' ? <PottedFern contained={contained} /> : null}
    </>
  );
}

/** Brass gear ring with two leaves around the round counter (behind the text). */
export function SolarpunkRoundBadgeDecor() {
  return (
    <>
      <span className={styles.gearTeeth} />
      <span className={styles.gearRing} />
      <svg viewBox="0 0 10 10" className={styles.badgeLeafLeft}>
        <Leaf x={8} y={9} length={8} angle={-50} />
      </svg>
      <svg viewBox="0 0 10 10" className={styles.badgeLeafRight}>
        <Leaf x={2} y={9} length={8} angle={50} color={C.leafLight} />
      </svg>
    </>
  );
}
