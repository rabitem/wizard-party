import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { AUTUMN_PALETTE as C } from './autumn-palette';
import styles from './autumn.module.css';

/** Width of the tucked oak leaf per button kind, in px. */
const OAK_LEAF_WIDTH: Record<HudButtonVariant, number> = { icon: 10, tile: 14, fab: 11, bid: 8 };

/** A lobed oak leaf on a 12x16 grid, stem pointing down. */
const OAK_LEAF =
  'M6 1Q8 2 7.4 3.6Q9.6 3.4 9 5.6Q11 5.8 10 8Q11.6 8.8 9.8 10.6Q10.6 12.4 8 12.4L6.6 13V15.4H5.4V13' +
  'L4 12.4Q1.4 12.4 2.2 10.6Q.4 8.8 2 8Q1 5.8 3 5.6Q2.4 3.4 4.6 3.6Q4 2 6 1Z';

/** Leaves of the corner pile: [x, y, rotation, colour, vein colour] on a 40x18 grid. */
const PILE_LEAVES: ReadonlyArray<readonly [number, number, number, string, string]> = [
  [4, 6, -60, C.gold, C.goldDark],
  [20, 7, 70, C.red, C.redDark],
  [12, 4, 15, C.orange, C.orangeDark],
  [27, 8, 100, C.gold, C.goldDark],
  [7, 9, -110, C.red, C.redDark],
  [15, 9, 40, C.acorn, C.acornDark],
];

/** Leaves around the round counter: angle on the ellipse (deg) and colour. */
const WREATH_LEAVES: ReadonlyArray<readonly [number, string]> = [
  [0, C.red], [30, C.gold], [60, C.orange], [100, C.red], [130, C.gold], [160, C.orange],
  [180, C.red], [210, C.gold], [240, C.orange], [280, C.red], [310, C.gold], [340, C.orange],
];

/** An oak leaf drawn into a 12x16 box. */
function OakLeaf({ className, fill, vein, width }: { className: string; fill: string; vein: string; width: number }) {
  return (
    <svg viewBox="0 0 12 16" className={className} style={{ width, height: (width * 16) / 12 }}>
      <path d={OAK_LEAF} fill={fill} stroke={C.outline} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M6 14V2.6M6 6.4L4 5.4M6 6.4L8 5.4M6 9.6L3.6 8.6M6 9.6L8.4 8.6" stroke={vein} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.8} />
    </svg>
  );
}

/** A small oak leaf tucked into the bottom-right corner and a warm inner glow. */
export function AutumnButtonDecor({ variant }: HudButtonDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={styles.warmGlow} />
      <OakLeaf className={styles.tuckedLeaf} fill={C.orange} vein={C.orangeDark} width={OAK_LEAF_WIDTH[variant]} />
    </span>
  );
}

/** A heap of fallen leaves in the bottom-left corner (behind the content). */
function LeafPile({ small }: { small: boolean }) {
  return (
    <svg viewBox="0 0 40 18" className={small ? styles.leafPileSmall : styles.leafPile}>
      {PILE_LEAVES.map(([x, y, rotate, fill, vein]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rotate} 6 8) scale(.85)`}>
          <path d={OAK_LEAF} fill={fill} stroke={C.outline} strokeWidth={1} strokeLinejoin="round" />
          <path d="M6 14V2.6" stroke={vein} strokeWidth={1} strokeLinecap="round" opacity={0.8} />
        </g>
      ))}
    </svg>
  );
}

/** A twig with three leaves and an acorn, resting on the bid picker's corner. */
function LeafyTwig({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 36 20" className={contained ? styles.twigContained : styles.twig}>
      <path d="M2 16Q14 12 33 4M15 11.4L19 16M24 7.6L26 2.4" stroke={C.bark} strokeWidth={1.4} strokeLinecap="round" fill="none" />
      <path d="M19 16Q24 18 25.6 13.4Q21 11.6 19 16Z" fill={C.red} stroke={C.redDark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M26 2.4Q31 .6 32.4 4.6Q28 6.4 26 2.4Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M8 14.2Q6.4 8.6 11 7.6Q12.4 12.6 8 14.2Z" fill={C.orange} stroke={C.orangeDark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M30.4 6.8Q30.4 10.4 32.6 11Q34.8 10.4 34.8 6.8Z" fill={C.acorn} stroke={C.acornDark} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M30 7.2Q30 4.6 32.6 4.6Q35.2 4.6 35.2 7.2Z" fill={C.cap} stroke={C.capDark} strokeWidth={0.8} strokeLinejoin="round" />
    </svg>
  );
}

/** Wooden plank on the top edge, leaves drifting behind the content and a per-panel ornament. */
export function AutumnPanelDecor({ variant, contained }: HudPanelDecorProps) {
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.fallingLeaves} />
        {variant !== 'status' ? <LeafPile small={variant === 'chat'} /> : null}
      </span>
      <span className={styles.clip}>
        <span className={variant === 'status' ? styles.plankSlim : styles.plank} />
      </span>
      {variant === 'picker' ? <LeafyTwig contained={contained} /> : null}
    </>
  );
}

/** A small pointed leaf, centred in its own box so it can be rotated around its middle. */
function WreathLeaf({ angle, fill }: { angle: number; fill: string }) {
  const rad = (angle * Math.PI) / 180;
  const left = 50 + 50 * Math.cos(rad);
  const top = 50 + 50 * Math.sin(rad);
  return (
    <svg
      viewBox="0 0 8 12"
      className={styles.wreathLeaf}
      style={{ left: `${left.toFixed(1)}%`, top: `${top.toFixed(1)}%`, transform: `translate(-50%, -50%) rotate(${angle + 120}deg)` }}
    >
      <path d="M4 .6Q7.6 5 4 11.4Q.4 5 4 .6Z" fill={fill} stroke={C.outline} strokeWidth={0.8} strokeLinejoin="round" />
      <path d="M4 2V10.4" stroke={C.redDark} strokeWidth={0.8} strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

/** A wreath of autumn leaves on a twig ring around the round counter (behind the text). */
export function AutumnRoundBadgeDecor() {
  return (
    <span className={styles.wreath}>
      <span className={styles.wreathTwig} />
      {WREATH_LEAVES.map(([angle, fill]) => <WreathLeaf key={angle} angle={angle} fill={fill} />)}
    </span>
  );
}
