import { starPath, twinklePath } from '@/presentation/components/hud/skins/celestial/celestial-icons';
import { CELESTIAL_PALETTE as C } from '@/presentation/components/hud/skins/celestial/celestial-palette';
import styles from './celestial-lobby.module.css';

/** Scene-only colours: hill and building silhouettes. */
const LAND = { hill: '#0b1030', hillFar: '#141b42', wall: '#1c2456', wallShade: '#121840' };

/** Twinkling stars as [x, y, size, delay]. */
const TWINKLES: readonly (readonly [number, number, number, number])[] = [
  [30, 62, 3.2, 0], [118, 46, 2.4, -1.2], [150, 88, 2, -2.1], [252, 54, 2.6, -0.6],
  [276, 92, 2, -1.8], [382, 70, 3, -2.6], [18, 112, 2, -0.9], [236, 30, 2.2, -1.5],
];

/** Faint background stars as [x, y]. */
const DUST: readonly (readonly [number, number])[] = [
  [52, 40], [84, 70], [100, 30], [134, 64], [170, 50], [190, 76], [214, 40], [230, 72],
  [262, 80], [292, 44], [320, 68], [344, 36], [366, 90], [396, 50], [10, 90], [72, 104],
];

/** A small constellation over the moon: stars as [x, y] joined in order. */
const CONSTELLATION: readonly (readonly [number, number])[] = [[96, 60], [110, 72], [128, 70], [140, 82], [132, 98]];

/** Ribs of the observatory dome, as angles (degrees from the left horizon). */
const DOME_RIBS = [30, 60, 120, 150];

/** Domed observatory on the right: drum with a lit door, ribbed dome, open slit and telescope. */
function Observatory() {
  const [cx, cy, r] = [332, 128, 34];
  return (
    <g>
      {/* dome with slit */}
      <path d={`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}Z`} fill={C.moonShade} stroke={C.outline} strokeWidth={1} />
      <g stroke={C.gold} strokeWidth={0.8} opacity={0.55}>
        {DOME_RIBS.map((deg) => {
          const a = (deg * Math.PI) / 180;
          const x = (cx - r * Math.cos(a)).toFixed(1);
          const y = (cy - r * Math.sin(a)).toFixed(1);
          return <path key={deg} d={`M${x} ${y}Q${cx} ${cy - r * 0.2} ${cx} ${cy}`} />;
        })}
      </g>
      <path d={`M${cx - 6} ${cy - r + 1}L${cx - 7} ${cy}H${cx + 7}L${cx + 6} ${cy - r + 1}Z`} fill={C.midnight} />
      {/* telescope through the slit, aimed up-left */}
      <path d="M332 112L318 64" stroke={C.outline} strokeWidth={7} strokeLinecap="round" />
      <path d="M332 112L318 64" stroke={C.brass} strokeWidth={5} strokeLinecap="round" />
      <path d="M319.2 67.5L318 63.5" stroke={C.goldLight} strokeWidth={5.6} strokeLinecap="round" />
      <path d="M326.4 92L324 84" stroke={C.brassDark} strokeWidth={5.6} />
      <path d={`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.gold} strokeWidth={1.4} />
      {/* drum */}
      <rect x={cx - r - 4} y={cy} width={2 * r + 8} height={5} fill={C.brass} stroke={C.outline} strokeWidth={0.6} />
      <rect x={cx - r + 2} y={cy + 5} width={2 * r - 4} height={50} fill={LAND.wall} />
      <rect x={cx + r - 18} y={cy + 5} width={16} height={50} fill={LAND.wallShade} />
      <path d={`M${cx - 6} ${cy + 55}V${cy + 24}Q${cx} ${cy + 16} ${cx + 6} ${cy + 24}V${cy + 55}Z`} fill={C.sun} opacity={0.85} className={styles.doorGlow} />
      <circle cx={cx - 20} cy={cy + 20} r={4} fill={C.goldLight} opacity={0.7} />
      <circle cx={cx + 20} cy={cy + 20} r={4} fill={C.goldLight} opacity={0.45} />
    </g>
  );
}

/**
 * Observatory night: a milky way band, a crescent moon with a constellation, shooting stars,
 * and a domed observatory on the hill at the right with its telescope aimed at the sky.
 */
export function CelestialScene() {
  const linePoints = CONSTELLATION.map(([x, y]) => `${x} ${y}`).join('L');
  return (
    <div className={styles.sceneSky}>
      <span className={styles.milkyWay} />
      <span className={styles.shootingStarA} />
      <span className={styles.shootingStarB} />
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <g fill={C.star} opacity={0.55}>
          {DUST.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={0.8} />)}
        </g>
        {TWINKLES.map(([x, y, size, delay]) => (
          <path key={`${x}-${y}`} d={twinklePath(x, y, size)} fill={C.star} className={styles.twinkle} style={{ animationDelay: `${delay}s` }} />
        ))}
        {/* crescent moon with a soft halo */}
        <circle cx={58} cy={100} r={34} fill={C.moon} opacity={0.08} />
        <circle cx={58} cy={100} r={26} fill={C.moon} opacity={0.08} />
        <path d="M58 78A22 22 0 1 0 58 122A10 22 0 1 1 58 78Z" fill={C.moon} stroke={C.goldLight} strokeWidth={0.6} />
        <circle cx={42} cy={96} r={2.2} fill={C.moonShade} opacity={0.25} />
        <circle cx={44} cy={110} r={1.5} fill={C.moonShade} opacity={0.25} />
        {/* constellation */}
        <path d={`M${linePoints}`} fill="none" stroke={C.gold} strokeWidth={0.7} strokeDasharray="2 2" opacity={0.6} />
        {CONSTELLATION.map(([x, y], i) => (
          <path key={`${x}-${y}`} d={starPath(x, y, i === 2 ? 2.6 : 1.8, i === 2 ? 1 : 0.7)} fill={C.goldLight} />
        ))}
        {/* hills */}
        <path d="M0 150Q60 132 130 146T260 150T400 128V180H0Z" fill={LAND.hillFar} />
        <Observatory />
        <path d="M0 162Q80 150 170 166Q240 176 290 168Q340 160 400 166V180H0Z" fill={LAND.hill} />
        <path d="M20 160l3-12l3 12ZM34 158l2.4-9l2.4 9Z" fill={LAND.hill} />
      </svg>
    </div>
  );
}

/** A slowly turning golden zodiac ring with a tick scale behind the emblem badge. */
export function CelestialHeaderDecor() {
  return (
    <>
      <span className={styles.zodiacRing} />
      <span className={styles.zodiacTicks} />
      <svg viewBox="0 0 10 10" className={styles.badgeStarA}>
        <path d={twinklePath(5, 5, 4.6)} fill={C.goldLight} />
      </svg>
      <svg viewBox="0 0 10 10" className={styles.badgeStarB}>
        <path d={twinklePath(5, 5, 4.6)} fill={C.goldLight} />
      </svg>
    </>
  );
}
