import { PixelArt } from '@/presentation/components/hud/skins/pixel/pixel-icons';
import { PIXEL_PALETTE as C } from '@/presentation/components/hud/skins/pixel/pixel-palette';
import { COIN, PixelSprite } from './pixel-lobby-icons';
import styles from './pixel-lobby.module.css';

/** Scene-only colours: night-city silhouettes and the cloud pixels. */
const CITY = { far: '#1d2350', near: '#11143a', edge: '#2e3672', cloud: '#3a4180', cloudLight: '#5a62a8' };

/** A full moon with grey craters (12x12, drawn 3 units per pixel). */
const MOON = [
  '....WWWW....',
  '..WWWWWWWW..',
  '.WWWWWWSWWW.',
  '.WWSSWWWWWW.',
  'WWWSSWWWWWWW',
  'WWWWWWWWSSWW',
  'WWWWWWWWSSWW',
  'WWSWWWWWWWWW',
  '.WWWWWWWWWW.',
  '.WWWWWSSWWW.',
  '..WWWWWWWW..',
  '....WWWW....',
];

/** Stars as [x, y, blink group]; groups blink out of phase. */
const STARS: readonly (readonly [number, number, number])[] = [
  [24, 40, 0], [60, 24, 1], [92, 52, 2], [132, 34, 0], [164, 60, 1], [212, 28, 2], [244, 48, 0],
  [276, 22, 1], [356, 40, 2], [384, 64, 0], [16, 76, 1], [112, 84, 2], [288, 88, 0], [380, 100, 1],
];

/** Buildings as [x, top, width]; x/width on the 4-unit pixel grid. */
const FAR_TOWERS: readonly (readonly [number, number, number])[] = [
  [0, 112, 28], [24, 96, 20], [72, 120, 24], [100, 104, 16], [276, 108, 20], [300, 92, 24], [340, 116, 20], [372, 100, 28],
];
const NEAR_TOWERS: readonly (readonly [number, number, number])[] = [
  [0, 128, 24], [28, 116, 32], [64, 136, 24], [92, 124, 28], [124, 148, 20],
  [256, 144, 24], [284, 120, 28], [316, 132, 24], [344, 112, 28], [376, 136, 24],
];

/** Lit windows of a tower: a sparse deterministic pattern of 4x4 cells. */
function windowsOf(x: number, top: number, w: number): [number, number, boolean][] {
  const cells: [number, number, boolean][] = [];
  for (let row = top + 8; row < 168; row += 8) {
    for (let col = x + 4; col <= x + w - 8; col += 8) {
      const hash = (row * 13 + col * 7) % 9;
      if (hash < 3) cells.push([col, row, hash === 0]);
    }
  }
  return cells;
}

function Towers({ towers, fill }: { towers: typeof NEAR_TOWERS; fill: string }) {
  return (
    <g>
      {towers.map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={180 - top} fill={fill} />
          <rect x={x} y={top} width={w} height={4} fill={CITY.edge} />
          {windowsOf(x, top, w).map(([cx, cy, blink]) => (
            <rect key={`${cx}-${cy}`} x={cx} y={cy} width={4} height={4} fill={blink ? C.yellowDark : C.yellow} className={blink ? styles.windowBlink : undefined} />
          ))}
        </g>
      ))}
    </g>
  );
}

/** A blocky cloud (44 units wide) made of stacked runs, top-left at (x, y). */
function Cloud({ x, y, className }: { x: number; y: number; className: string }) {
  return (
    <g className={className}>
      <rect x={x + 8} y={y} width={16} height={4} fill={CITY.cloudLight} />
      <rect x={x + 4} y={y + 4} width={32} height={4} fill={CITY.cloudLight} />
      <rect x={x} y={y + 8} width={44} height={4} fill={CITY.cloud} />
      <rect x={x + 4} y={y + 12} width={32} height={4} fill={CITY.cloud} />
    </g>
  );
}

/**
 * 8-bit night city: blinking stars, a pixel moon, clouds drifting across, two rows of blocky
 * towers with lit windows and a rooftop sign, a road along the bottom.
 */
export function PixelScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" className="absolute inset-0 w-full h-full">
        {STARS.map(([x, y, group]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={2} height={2} fill={C.white} className={styles[`star${group}`]} />
        ))}
        <g opacity={0.12} fill={C.white}>
          <rect x={312} y={52} width={36} height={52} />
          <rect x={304} y={60} width={52} height={36} />
        </g>
        <PixelArt rows={MOON} x={312} y={60} cell={3} />
        <Cloud x={40} y={64} className={styles.cloudSlow} />
        <Cloud x={220} y={84} className={styles.cloudFast} />
        <Towers towers={FAR_TOWERS} fill={CITY.far} />
        <Towers towers={NEAR_TOWERS} fill={CITY.near} />
        {/* rooftop sign on the tallest near tower */}
        <rect x={348} y={100} width={20} height={8} fill={C.redDark} />
        <rect x={350} y={102} width={16} height={4} fill={C.red} className={styles.sign} />
        <rect x={356} y={108} width={2} height={4} fill={CITY.edge} />
        {/* road */}
        <rect x={0} y={168} width={400} height={12} fill="#0a0c24" />
        <g fill={C.grayDark}>
          {Array.from({ length: 13 }, (_, i) => <rect key={i} x={i * 32 + 4} y={173} width={16} height={2} />)}
        </g>
      </svg>
    </div>
  );
}

/** A stepped pixel frame behind the emblem, with a coin popping out over its corner. */
export function PixelHeaderDecor() {
  return (
    <>
      <span className={styles.badgeFrame} />
      <PixelSprite rows={COIN} className={styles.badgeCoin} />
    </>
  );
}
