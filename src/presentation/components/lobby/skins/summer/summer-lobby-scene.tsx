import { SUMMER_PALETTE as C } from '@/presentation/components/hud/skins/summer/summer-palette';
import styles from './summer-lobby.module.css';

/** Scene-only colours not in the HUD palette. */
const PALM = { trunk: '#5a3a1c', trunkRing: '#3b2410', frond: '#1f7a4d', frondDark: '#145c39', coconut: '#6b4423' };
const SEA = '#0e5b6b';

/** Palm fronds as [path] around the crown at (70, 78). */
const FRONDS = [
  'M70 78Q48 66 22 78Q46 70 70 82Z',
  'M70 78Q52 54 30 50Q54 60 68 80Z',
  'M70 78Q78 50 102 44Q82 58 72 80Z',
  'M70 78Q96 66 120 82Q94 72 70 82Z',
  'M70 78Q88 84 104 104Q84 86 68 82Z',
];

function Palm() {
  return (
    <g>
      <path d="M44 180Q40 132 70 80" stroke={PALM.trunk} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M44 180Q40 132 70 80" stroke={PALM.trunkRing} strokeWidth={7} fill="none" strokeDasharray="1.2 5" />
      <g className={styles.palmFronds}>
        {FRONDS.map((d, i) => <path key={d} d={d} fill={i % 2 ? PALM.frondDark : PALM.frond} stroke={C.outline} strokeWidth={0.6} />)}
        <circle cx={67} cy={83} r={3.2} fill={PALM.coconut} />
        <circle cx={73} cy={84} r={3} fill={PALM.coconut} />
      </g>
    </g>
  );
}

function LifeguardTower() {
  return (
    <g>
      {/* stilts, braces, ladder */}
      <g stroke={C.sandDark} strokeWidth={2.4} strokeLinecap="round">
        <path d="M312 178L320 108M362 178L354 108" />
        <path d="M315 160L359 134M359 160L315 134" strokeWidth={1.4} />
      </g>
      <g stroke={C.white} strokeWidth={1.2} opacity={0.85}>
        <path d="M326 178L331 109M338 178L337 109" />
        <path d="M327 168h10M328 156h9M329 144h8M330 132h7M331 120h6" />
      </g>
      <rect x={304} y={104} width={66} height={5} rx={1} fill={C.sandDark} />
      {/* hut */}
      <rect x={314} y={80} width={46} height={24} fill={C.white} stroke={C.outline} strokeWidth={0.8} />
      <rect x={314} y={86} width={46} height={4} fill={C.red} />
      <rect x={314} y={96} width={46} height={4} fill={C.red} />
      <rect x={329} y={84} width={16} height={9} fill={C.navy} opacity={0.85} />
      <path d="M306 81L337 65L368 81Z" fill={C.red} stroke={C.outline} strokeWidth={0.8} />
      {/* flag */}
      <path d="M337 65V42" stroke={C.white} strokeWidth={1.2} />
      <path className={styles.flag} d="M337 42l17 4.5l-17 4.5Z" fill={C.yellow} stroke={C.outline} strokeWidth={0.5} />
      {/* life ring on the stilt */}
      <circle cx={364} cy={124} r={5} fill="none" stroke={C.red} strokeWidth={2.6} />
      <circle cx={364} cy={124} r={5} fill="none" stroke={C.white} strokeWidth={2.6} strokeDasharray="3.9 3.9" />
    </g>
  );
}

function BeachBall() {
  return (
    <g className={styles.ball}>
      <circle cx={244} cy={166} r={7.5} fill={C.white} stroke={C.outline} strokeWidth={0.8} />
      <path d="M244 158.5Q238 166 244 173.5Q236.5 172 236.5 166Q236.5 160 244 158.5Z" fill={C.pink} />
      <path d="M244 158.5Q250 166 244 173.5Q251.5 172 251.5 166Q251.5 160 244 158.5Z" fill={C.turquoise} />
      <circle cx={241.5} cy={162.5} r={1.5} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

/** Beach club at sunset: palm, sea with the sun on the horizon, lifeguard tower, beach ball. */
export function SummerScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx={200} cy={140} r={30} fill={C.orange} opacity={0.4} />
        <circle cx={200} cy={140} r={21} fill={C.yellow} opacity={0.45} />
        <g className={styles.gulls} stroke="#0b2a30" strokeWidth={1.4} fill="none" strokeLinecap="round">
          <path d="M118 70q4-4 8 0q4-4 8 0" />
          <path d="M146 60q3-3 6 0q3-3 6 0" />
          <path d="M262 66q3-3 6 0q3-3 6 0" />
        </g>
        <rect x={0} y={138} width={400} height={42} fill={SEA} opacity={0.92} />
        <g className={styles.shimmer} fill={C.yellow} opacity={0.55}>
          <rect x={184} y={143} width={32} height={1.6} rx={0.8} />
          <rect x={190} y={149} width={20} height={1.4} rx={0.7} />
          <rect x={195} y={155} width={10} height={1.2} rx={0.6} />
        </g>
        <path d="M0 147q12-3 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0" stroke={C.foam} strokeWidth={1} opacity={0.35} fill="none" />
        <path d="M0 158q14 4 28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0t28 0" stroke={C.foam} strokeWidth={1} opacity={0.25} fill="none" />
        <path d="M0 152Q64 140 138 158L156 180H0Z" fill={C.sand} />
        <path d="M0 160Q60 152 120 166L132 180H0Z" fill={C.sandDark} opacity={0.35} />
        <path d="M254 164Q330 142 400 148V180H244Z" fill={C.sand} />
        <path d="M270 172Q340 156 400 160V180H262Z" fill={C.sandDark} opacity={0.3} />
        <Palm />
        <LifeguardTower />
        <BeachBall />
      </svg>
    </div>
  );
}

/** Slowly turning sun rays behind the emblem badge. */
export function SummerHeaderDecor() {
  return <span className={styles.sunRays} />;
}
