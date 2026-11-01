import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { WINTER_PALETTE as C } from './winter-palette';
import styles from './winter.module.css';

/** Icicles under the button's snow cap: [left %, length px] per button kind. */
const BUTTON_ICICLES: Record<HudButtonVariant, ReadonlyArray<readonly [number, number]>> = {
  icon: [[28, 4], [62, 3]],
  tile: [[18, 5], [44, 3.5], [74, 4.5]],
  fab: [[30, 4], [64, 3]],
  bid: [[50, 3]],
};

/** A drift of snow on a 100x10 grid: bumpy top, softly sagging bottom (stretched to fit). */
const SNOW_DRIFT =
  'M0 9Q1 4 6 3.4Q11 1 17 2.6Q24 .4 31 2.4Q38 .8 45 2.2Q53 .2 60 2.6Q68 .6 75 2.2Q83 .4 90 2.6Q97 2 100 7' +
  'V9Q96 8 92 9.4Q88 10 85 8.6Q78 7.6 70 8.8Q62 10 55 8.4Q46 7.6 38 9Q30 10 22 8.4Q14 7.6 8 9Q3 9.6 0 9Z';

/** Fir needles along the sprig branch, as short strokes on a 40x24 grid. */
const FIR_NEEDLES =
  'M6 15l-1.6-3M6 15l1-3.2M10 13.6l-1.4-3.2M10 13.6l1.4-3M14 12.2l-1.2-3.2M14 12.2l1.8-2.8M18 11l-1-3.2M18 11l2-2.6' +
  'M22 9.8l-.8-3.2M22 9.8l2.2-2.4M26 8.8l-.6-3.2M26 8.8l2.4-2M8 14.4l-.4 3.2M8 14.4l2.4 2.2M12 13l-.2 3.2M12 13l2.6 2' +
  'M16 11.6v3.2M16 11.6l2.8 1.8M20 10.4l.2 3.2M20 10.4l2.8 1.4M24 9.2l.4 3.2M24 9.2l3 1.2M28 8.4l3 .8';

/** A snowdrift stretched across its box. */
function SnowDrift({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className={className}>
      <path d={SNOW_DRIFT} fill={C.snow} />
      <path d="M2 8.6Q30 6.6 50 8Q72 9.4 98 7.6" stroke={C.snowShade} strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A snow cap resting on the top edge with tiny icicles hanging beneath it. */
export function WinterButtonDecor({ variant }: HudButtonDecorProps) {
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={styles.frostRim} />
      <span className={styles.buttonCapClip}>
        <SnowDrift className={styles.buttonCap} />
        {BUTTON_ICICLES[variant].map(([left, length]) => (
          <span key={left} className={styles.buttonIcicle} style={{ left: `${left}%`, height: length }} />
        ))}
      </span>
    </span>
  );
}

/** A frost crystal fern growing out of the top-left corner (rotate the box for other corners). */
function FrostCorner({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className}>
      <g stroke={C.frost} strokeWidth={0.8} strokeLinecap="round" fill="none">
        <path d="M0 0L14 14M4 4L7.6 2.4M4 4L2.4 7.6M8 8L12.4 6.6M8 8L6.6 12.4M11.2 11.2L14.4 10.4M11.2 11.2L10.4 14.4" />
        <path d="M0 6Q4 7 6 11M6 0Q7 4 11 6M2.4 9.6l-1.2 1.8M9.6 2.4l1.8-1.2" opacity={0.7} />
      </g>
      <circle cx={14.4} cy={14.4} r={0.9} fill={C.snow} />
    </svg>
  );
}

/** A fir sprig with a red bauble hanging from it. */
function FirSprig({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 40 24" className={contained ? styles.sprigContained : styles.sprig}>
      <path d="M4 16.4Q16 12 32 7.4" stroke={C.woodDark} strokeWidth={1.2} strokeLinecap="round" fill="none" />
      <path d={FIR_NEEDLES} stroke={C.firDark} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <path d={FIR_NEEDLES} stroke={C.fir} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      <path d="M6 11.4l1.6 1M14 8.4l1.4.8M23 6l1.4.6" stroke={C.snow} strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
      <path d="M20 10.6V14" stroke={C.gold} strokeWidth={0.8} />
      <path d="M18.8 13.6h2.4v1.8h-2.4Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.6} />
      <circle cx={20} cy={19.2} r={4.2} fill={C.red} stroke={C.redDark} strokeWidth={0.8} />
      <path d="M16.2 18.4Q20 19.8 23.8 18.4" stroke={C.gold} strokeWidth={0.8} fill="none" opacity={0.8} />
      <circle cx={18.6} cy={17.6} r={0.9} fill="#ffffff" opacity={0.75} />
    </svg>
  );
}

/** Snow piled on the top edge with icicles, frost in the corners, drifting snowflakes behind. */
export function WinterPanelDecor({ variant, contained }: HudPanelDecorProps) {
  const slim = variant === 'status';
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.snowfall} />
      </span>
      <span className={styles.clip}>
        <FrostCorner className={slim ? styles.frostTopLeftSmall : styles.frostTopLeft} />
        <FrostCorner className={slim ? styles.frostTopRightSmall : styles.frostTopRight} />
        {slim ? null : <FrostCorner className={styles.frostBottomLeft} />}
        <span className={slim ? styles.iciclesSlim : styles.icicles} />
      </span>
      <SnowDrift className={contained || slim ? styles.snowEdgeContained : styles.snowEdge} />
      {variant === 'picker' ? <FirSprig contained={contained} /> : null}
    </>
  );
}

/** Angles (deg) of the fir clusters around the round counter's wreath. */
const WREATH_ANGLES = [0, 30, 60, 120, 150, 180, 210, 240, 270, 300, 330];

/** A tuft of fir needles, centred in its own box so it can be rotated around its middle. */
function FirTuft({ angle }: { angle: number }) {
  const rad = (angle * Math.PI) / 180;
  return (
    <svg
      viewBox="0 0 10 10"
      className={styles.firTuft}
      style={{
        left: `${(50 + 50 * Math.cos(rad)).toFixed(1)}%`,
        top: `${(50 + 50 * Math.sin(rad)).toFixed(1)}%`,
        transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
      }}
    >
      <path d="M5 9V1M5 7L2 5M5 7L8 5M5 4.6L2.6 2.6M5 4.6L7.4 2.6" stroke={C.fir} strokeWidth={1.3} strokeLinecap="round" fill="none" />
    </svg>
  );
}

/** A fir wreath with a red ribbon bow around the round counter (behind the text). */
export function WinterRoundBadgeDecor() {
  return (
    <span className={styles.wreath}>
      <span className={styles.wreathRing} />
      {WREATH_ANGLES.map((angle) => <FirTuft key={angle} angle={angle} />)}
      <svg viewBox="0 0 16 10" className={styles.bow}>
        <path d="M8 4.6L2 1.4Q.6 4.6 2 7.8ZM8 4.6L14 1.4Q15.4 4.6 14 7.8Z" fill={C.red} stroke={C.redDark} strokeWidth={0.8} strokeLinejoin="round" />
        <path d="M7.4 5.2L5.6 9.6M8.6 5.2L10.4 9.6" stroke={C.red} strokeWidth={1.4} strokeLinecap="round" />
        <circle cx={8} cy={4.8} r={1.6} fill={C.redDark} />
      </svg>
    </span>
  );
}
