import { HALLOWEEN_PALETTE as C } from '@/presentation/components/hud/skins/halloween/halloween-palette';
import styles from './halloween-lobby.module.css';

/** Silhouette ink for the scene (near-black aubergine) and its moonlit rim. */
const INK = '#0b0512';
const RIM = '#3a2350';

/** Lit manor windows as [x, y, w, h]; every other one flickers. */
const WINDOWS: readonly (readonly [number, number, number, number])[] = [
  [297, 120, 5, 7],
  [318, 112, 4, 6],
  [336, 124, 5, 7],
  [352, 124, 5, 7],
  [370, 104, 4, 6],
  [318, 128, 4, 6],
];

/** Bats as [x, y, scale]. */
const BATS: readonly (readonly [number, number, number])[] = [
  [112, 62, 1],
  [140, 78, 0.7],
  [262, 70, 0.8],
];

function Bat({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className={styles.batWings} d="M0 0Q-4-5-10-4Q-8-1-11 1Q-6 0-4 3Q-2 1 0 2Q2 1 4 3Q6 0 11 1Q8-1 10-4Q4-5 0 0Z" fill={INK} stroke={RIM} strokeWidth={0.4} />
    </g>
  );
}

function Manor() {
  return (
    <g>
      <path d="M226 180Q300 136 400 134V180Z" fill={INK} />
      <path
        d="M286 142V116L294 104L302 116V112H310V100L320 82L330 100V114H344V108L354 98L364 108V96L372 76L380 96V142Z"
        fill={INK}
        stroke={RIM}
        strokeWidth={0.8}
      />
      <path d="M320 82V74M372 76V68" stroke={RIM} strokeWidth={0.8} />
      {WINDOWS.map(([x, y, w, h], i) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={1} fill={C.glow} className={i % 2 ? styles.windowFlicker : undefined} opacity={0.85} />
      ))}
    </g>
  );
}

function DeadTree() {
  return (
    <path
      d="M30 180L34 130L22 108L14 104M34 130L44 104L58 92L70 90M44 104L40 86L46 70M58 92L62 78M34 130L28 116L18 120"
      stroke={INK}
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

function Graveyard() {
  return (
    <g>
      <path d="M0 166Q80 154 170 168V180H0Z" fill={INK} />
      <g stroke={INK} strokeWidth={1.6}>
        <path d="M4 168H116" />
        {[8, 20, 32, 44, 56, 68, 80, 92, 104].map((x) => <path key={x} d={`M${x} 172V154l1.5-3l1.5 3V172`} />)}
      </g>
      <path d="M124 170V160Q124 152 131 152Q138 152 138 160V170Z" fill={C.ironLight} opacity={0.75} />
      <path d="M146 172V164Q146 159 151 159Q156 159 156 164V172Z" fill={C.ironLight} opacity={0.6} />
      <path d="M131 155v7M128.5 157.5h5" stroke={INK} strokeWidth={1} />
    </g>
  );
}

/** Haunted manor on the hill under a full moon, a dead tree, graveyard fence, bats and fog. */
export function HalloweenScene() {
  return (
    <div className={styles.sceneNight}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx={78} cy={92} r={40} fill={C.glow} opacity={0.08} />
        <circle cx={78} cy={92} r={26} fill="#f6efcf" opacity={0.92} />
        <circle cx={70} cy={86} r={4} fill="#ded4ad" opacity={0.8} />
        <circle cx={86} cy={100} r={6} fill="#ded4ad" opacity={0.6} />
        <circle cx={84} cy={82} r={2.4} fill="#ded4ad" opacity={0.7} />
        <DeadTree />
        <Manor />
        <Graveyard />
        <g className={styles.bats}>
          {BATS.map(([x, y, s]) => <Bat key={`${x}-${y}`} x={x} y={y} s={s} />)}
        </g>
      </svg>
      <span className={styles.fog} />
    </div>
  );
}

/** Bat wings unfolding behind the emblem badge. */
export function HalloweenHeaderDecor() {
  return (
    <>
      <svg viewBox="0 0 30 20" className={styles.wingLeft}>
        <path d="M30 4Q18-2 2 4Q6 7 3 11Q9 9 11 14Q15 10 18 15Q21 10 30 12Z" fill={C.night} stroke={C.purple} strokeWidth={0.8} />
      </svg>
      <svg viewBox="0 0 30 20" className={styles.wingRight}>
        <path d="M30 4Q18-2 2 4Q6 7 3 11Q9 9 11 14Q15 10 18 15Q21 10 30 12Z" fill={C.night} stroke={C.purple} strokeWidth={0.8} />
      </svg>
    </>
  );
}
