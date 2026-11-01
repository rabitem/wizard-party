import type { HudButtonDecorProps, HudButtonVariant, HudPanelDecorProps } from '../hud-skin.types';
import { twinklePath } from './celestial-icons';
import { CELESTIAL_PALETTE as C } from './celestial-palette';
import styles from './celestial.module.css';

/** Edge length of the filigree corner scrolls per button kind, in px. */
const FILIGREE_SIZE: Record<HudButtonVariant, number> = { icon: 9, tile: 12, fab: 9, bid: 7 };

/** Size of the twinkling star per button kind, in px. */
const STAR_SIZE: Record<HudButtonVariant, number> = { icon: 7, tile: 9, fab: 8, bid: 6 };

/** Twinkling points in the star dust: position (% of the panel) and size (px). */
const TWINKLES = [
  { left: 12, top: 24, size: 6, delay: 0 },
  { left: 36, top: 72, size: 5, delay: 1.3 },
  { left: 62, top: 32, size: 7, delay: 2.4 },
  { left: 86, top: 66, size: 5, delay: 0.7 },
  { left: 78, top: 14, size: 6, delay: 3.1 },
];

/** Zodiac glyphs on a 10x10 grid: aries, taurus, gemini, leo, pisces. */
const ZODIAC_GLYPHS = [
  'M5 8.5V4.5M5 4.5C5 2 2 1.5 1.8 3.4M5 4.5C5 2 8 1.5 8.2 3.4',
  'M1.5 1.8Q2.5 4 5 4Q7.5 4 8.5 1.8M7.3 6.2A2.3 2.3 0 1 1 2.7 6.2A2.3 2.3 0 1 1 7.3 6.2Z',
  'M2 1.8Q5 3 8 1.8M2 8.2Q5 7 8 8.2M3.6 2.5V7.5M6.4 2.5V7.5',
  'M3 7.5A1.4 1.4 0 1 1 3.3 5.3C3 3 3.5 1.6 5.3 1.6C7.3 1.6 7.6 3.6 6.6 5.2C5.8 6.6 6.2 8.2 8 8',
  'M2 1.5Q4 5 2 8.5M8 1.5Q6 5 8 8.5M2.6 5H7.4',
];

/** Medallion positions along the arc (0..1 of its width). */
const ZODIAC_STOPS = [0.12, 0.31, 0.5, 0.69, 0.88];

/** Arc (viewBox 100x12): from y 11 at both ends up to y 1 in the middle. */
const ARC_PATH = 'M0 11Q50 -9 100 11';

/** Height of the arc at `t` (0..1), in px (the arc box is 12px tall, mapped 1:1). */
function arcY(t: number): number {
  return (1 - t) ** 2 * 11 + 2 * (1 - t) * t * -9 + t ** 2 * 11;
}

/** A gold filigree scroll for the top-left corner; CSS mirrors it to other corners. */
function Filigree({ className, size }: { className: string; size: number }) {
  return (
    <svg viewBox="0 0 10 10" className={className} style={{ width: size, height: size }}>
      <g stroke={C.gold} strokeWidth={0.8} strokeLinecap="round" fill="none">
        <path d="M1 9V4.5Q1 1 4.5 1H9" />
        <path d="M1 6.4Q3.4 6.4 3.4 4Q3.4 2.6 4.8 2.6Q6 2.6 6 3.8" />
      </g>
      <circle cx={6.2} cy={6.2} r={0.8} fill={C.goldLight} />
    </svg>
  );
}

/** Gold filigree on two corners and a twinkling star on the top-right one. */
export function CelestialButtonDecor({ variant }: HudButtonDecorProps) {
  const filigree = FILIGREE_SIZE[variant];
  const star = STAR_SIZE[variant];
  return (
    <span className="absolute inset-0 rounded-[inherit]">
      <span className={styles.goldRim} />
      <Filigree className={styles.filigreeTl} size={filigree} />
      <Filigree className={styles.filigreeBr} size={filigree} />
      <svg
        viewBox="0 0 10 10"
        className={`${styles.buttonStar} transition-transform duration-500 motion-safe:group-hover:scale-125`}
        style={{ width: star, height: star }}
      >
        <path d={twinklePath(5, 5, 4.6)} fill={C.star} stroke={C.goldDark} strokeWidth={0.6} />
      </svg>
    </span>
  );
}

/** One zodiac medallion: a midnight disc with a gold rim and a gilded glyph. */
function ZodiacMedallion({ glyph, t, contained }: { glyph: string; t: number; contained: boolean }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className={contained ? styles.medallionContained : styles.medallion}
      style={{ left: `${t * 100}%`, top: `${arcY(t)}px` }}
    >
      <circle cx={5} cy={5} r={4.4} fill={C.midnight} stroke={C.gold} strokeWidth={0.8} />
      <path d={glyph} stroke={C.goldLight} strokeWidth={1.1} strokeLinecap="round" fill="none" transform="translate(5 5) scale(.6) translate(-5 -5)" />
    </svg>
  );
}

/** A gold zodiac arc rising over the top edge of the standings panel. */
function ZodiacArc({ contained }: { contained: boolean }) {
  return (
    <span className={contained ? styles.zodiacContained : styles.zodiac}>
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" className={styles.zodiacLine}>
        <path d={ARC_PATH} stroke={C.outline} strokeWidth={2.4} fill="none" vectorEffect="non-scaling-stroke" />
        <path d={ARC_PATH} stroke={C.gold} strokeWidth={1.2} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {ZODIAC_GLYPHS.map((glyph, i) => (
        <ZodiacMedallion key={ZODIAC_STOPS[i]} glyph={glyph} t={ZODIAC_STOPS[i]} contained={contained} />
      ))}
    </span>
  );
}

/** A crescent moon dangling on a gold thread from the standings panel. */
function DanglingMoon({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 12 16" className={contained ? styles.moonContained : styles.moon}>
      <path d="M6 0V5.6" stroke={C.goldLight} strokeWidth={0.6} />
      <path d="M5.6 5.8A4.3 4.3 0 1 0 9.6 12.6A4.1 4.1 0 0 1 5.6 5.8Z" fill={C.moon} stroke={C.goldDark} strokeWidth={0.6} />
      <circle cx={4.2} cy={10.4} r={0.5} fill={C.moonShade} opacity={0.5} />
      <path d={twinklePath(10, 7.6, 1.5)} fill={C.star} />
    </svg>
  );
}

/** A small brass telescope on a tripod peeking over the bid picker. */
function Telescope({ contained }: { contained: boolean }) {
  return (
    <svg viewBox="0 0 22 20" className={contained ? styles.telescopeContained : styles.telescope}>
      <path d="M10.6 11L6.2 19.4M10.6 11L15 19.4M10.6 11V19.4" stroke={C.brassDark} strokeWidth={0.9} strokeLinecap="round" />
      <g transform="rotate(-30 11 10)">
        <rect x={1} y={8.8} width={2.6} height={2.4} rx={0.4} fill={C.brassDark} />
        <path d="M3.4 8.6L16.6 7.6V12.4L3.4 11.4Z" fill={C.brass} stroke={C.brassDark} strokeWidth={0.6} />
        <rect x={16.4} y={7} width={2.2} height={6} rx={0.5} fill={C.gold} stroke={C.brassDark} strokeWidth={0.6} />
        <path d="M8 8.3V11.7M12.6 8V12" stroke={C.goldLight} strokeWidth={0.7} />
        <path d="M4.4 9.2L15.6 8.4" stroke="#ffffff" strokeWidth={0.5} opacity={0.5} />
      </g>
      <circle cx={10.6} cy={11} r={1.1} fill={C.gold} stroke={C.brassDark} strokeWidth={0.5} />
    </svg>
  );
}

/** Star dust with twinkling points behind the content, a gilded top edge, per-panel ornaments. */
export function CelestialPanelDecor({ variant, contained }: HudPanelDecorProps) {
  return (
    <>
      <span className={styles.clipBehind}>
        <span className={styles.stardust} />
        {TWINKLES.map((tw) => (
          <svg
            key={tw.left}
            viewBox="0 0 10 10"
            className={styles.twinkle}
            style={{ left: `${tw.left}%`, top: `${tw.top}%`, width: tw.size, height: tw.size, animationDelay: `${tw.delay}s` }}
          >
            <path d={twinklePath(5, 5, 4.8)} fill={C.star} />
          </svg>
        ))}
      </span>
      <span className={styles.clip}>
        <span className={variant === 'status' ? styles.goldEdgeSlim : styles.goldEdge} />
      </span>
      {variant === 'standings' ? (
        <>
          <ZodiacArc contained={contained} />
          <DanglingMoon contained={contained} />
        </>
      ) : null}
      {variant === 'picker' ? <Telescope contained={contained} /> : null}
    </>
  );
}

/** Golden sun rays and a thin zodiac ring around the round counter (behind the text). */
export function CelestialRoundBadgeDecor() {
  return (
    <>
      <span className={styles.sunRays} />
      <span className={styles.zodiacRing} />
    </>
  );
}
