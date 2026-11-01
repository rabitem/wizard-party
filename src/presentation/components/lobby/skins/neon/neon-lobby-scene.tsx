import { NEON_PALETTE as C } from '@/presentation/components/hud/skins/neon/neon-palette';
import styles from './neon-lobby.module.css';

/** Silhouette ink of the skyline. */
const INK = '#0b0418';

/** Buildings as [x, top, width]; all run down to the floor (hidden behind the grid). */
const LEFT_TOWERS: readonly (readonly [number, number, number])[] = [
  [0, 96, 22],
  [20, 70, 18],
  [40, 104, 26],
  [64, 84, 16],
  [82, 112, 30],
  [110, 122, 22],
];
const RIGHT_TOWERS: readonly (readonly [number, number, number])[] = [
  [268, 118, 24],
  [290, 92, 20],
  [312, 108, 28],
  [338, 66, 18],
  [354, 100, 24],
  [376, 86, 24],
];

/** Window grid of a tower: a sparse pattern of lit cells, alternating cyan/pink per tower. */
function Windows({ x, top, w, color }: { x: number; top: number; w: number; color: string }) {
  const cells: [number, number][] = [];
  for (let row = top + 6; row < 170; row += 7) {
    for (let col = x + 4; col < x + w - 4; col += 6) {
      if ((row * 7 + col * 3) % 5 < 2) cells.push([col, row]);
    }
  }
  return (
    <g fill={color} opacity={0.7}>
      {cells.map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx} y={cy} width={2.4} height={2.4} />)}
    </g>
  );
}

function Skyline({ towers, flip }: { towers: typeof LEFT_TOWERS; flip: boolean }) {
  return (
    <g>
      {towers.map(([x, top, w], i) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={180 - top} fill={INK} />
          <path d={`M${x} ${top}H${x + w}`} stroke={(i + (flip ? 1 : 0)) % 2 ? C.cyan : C.pink} strokeWidth={0.8} opacity={0.8} />
          <Windows x={x} top={top} w={w} color={(i + (flip ? 1 : 0)) % 2 ? C.cyan : C.pink} />
        </g>
      ))}
    </g>
  );
}

/** Rooftop synthwave: striped sun on the horizon, skyline with lit windows, scrolling neon grid. */
export function NeonScene() {
  return (
    <div className={styles.sceneSky}>
      <span className={styles.sun} />
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <Skyline towers={LEFT_TOWERS} flip={false} />
        <Skyline towers={RIGHT_TOWERS} flip />
        <path d="M347 66V54" stroke={C.metalLight} strokeWidth={1} />
        <circle className={styles.beacon} cx={347} cy={53} r={1.8} fill="#ff3b3b" />
        <path d="M29 70V60" stroke={C.metalLight} strokeWidth={1} />
        <circle className={styles.beacon} cx={29} cy={59} r={1.6} fill="#ff3b3b" style={{ animationDelay: '0.8s' }} />
      </svg>
      <span className={styles.gridFloor} />
      <span className={styles.horizon} />
    </div>
  );
}

/** A double neon tube ring humming around the emblem badge. */
export function NeonHeaderDecor() {
  return (
    <>
      <span className={styles.badgeRingOuter} />
      <span className={styles.badgeRingInner} />
    </>
  );
}
