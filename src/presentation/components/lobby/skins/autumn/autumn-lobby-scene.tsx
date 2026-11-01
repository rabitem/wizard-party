import { AUTUMN_PALETTE as C } from '@/presentation/components/hud/skins/autumn/autumn-palette';
import styles from './autumn-lobby.module.css';

/** Scene-only colours not in the HUD palette. */
const LAND = { far: '#7a4520', mid: '#8f5a22', near: '#4a2c12', barnRoof: '#5a1a10', silo: '#9c8f80', siloDark: '#6a6056', crow: '#1c1410' };

/** A small leaf (stem down) centred on the origin. */
const LEAF_PATH = 'M0 -5Q4.2 -2 0 5Q-4.2 -2 0 -5Z';

/** Drifting leaves as [x, y, rotation, colour, delay s]. */
const DRIFTING: readonly (readonly [number, number, number, string, number])[] = [
  [128, 40, 20, C.red, 0],
  [176, 22, -30, C.gold, 2.4],
  [232, 46, 60, C.orange, 4.1],
  [282, 28, -10, C.red, 1.2],
  [154, 78, 40, C.orange, 5.6],
  [256, 84, -50, C.gold, 3.3],
];

function Barn() {
  return (
    <g>
      {/* silo */}
      <rect x={14} y={98} width={17} height={64} fill={LAND.silo} stroke={C.outline} strokeWidth={0.6} />
      <path d="M14 98Q22.5 84 31 98Z" fill={LAND.siloDark} stroke={C.outline} strokeWidth={0.6} />
      <path d="M14 112H31M14 126H31M14 140H31M14 154H31" stroke={LAND.siloDark} strokeWidth={0.8} />
      {/* lean-to shed */}
      <rect x={94} y={134} width={22} height={28} fill={C.redDark} />
      <path d="M92 136L96 126L118 132V136Z" fill={LAND.barnRoof} />
      {/* barn body + gambrel roof */}
      <rect x={36} y={120} width={60} height={42} fill={C.red} stroke={C.outline} strokeWidth={0.6} />
      <path d="M36 128H96M36 136H96M36 144H96M36 152H96" stroke={C.redDark} strokeWidth={0.6} opacity={0.6} />
      <path d="M30 122L40 102L66 90L92 102L102 122Z" fill={LAND.barnRoof} stroke={C.outline} strokeWidth={0.6} />
      <path d="M32 122L41 103L66 91.5L91 103L100 122" stroke={C.cream} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      {/* hayloft with hay peeking out */}
      <rect x={59} y={104} width={14} height={11} fill={C.capDark} stroke={C.cream} strokeWidth={1.2} />
      <path d="M60 115Q62 109 64 115Q66 108 68 115Q70 110 72 115Z" fill={C.wheat} />
      {/* big doors with the classic white X */}
      <rect x={52} y={136} width={28} height={26} fill={C.redDark} stroke={C.cream} strokeWidth={1.4} />
      <path d="M66 136V162M52 136L66 162M66 136L52 162M66 136L80 162M80 136L66 162" stroke={C.cream} strokeWidth={1} />
      {/* fence */}
      <g stroke={C.woodLight} strokeWidth={1.6} strokeLinecap="round">
        <path d="M120 164V150M138 165V151M156 166V152M174 167V153" />
        <path d="M118 154L176 157M118 160L176 163" strokeWidth={1.2} />
      </g>
    </g>
  );
}

/** A round hay bale seen from the side: a disc with a rolled spiral. */
function RoundBale({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.8} />
      <path
        d={`M${cx} ${cy}m-${r * 0.2} 0a${r * 0.2} ${r * 0.2} 0 1 1 ${r * 0.4} 0a${r * 0.45} ${r * 0.45} 0 1 1 -${r * 0.9} 0a${r * 0.7} ${r * 0.7} 0 1 1 ${r * 1.4} 0`}
        stroke={C.wheatDark}
        strokeWidth={0.7}
        fill="none"
      />
    </g>
  );
}

function Pumpkin({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={6 * s} ry={4.6 * s} fill={C.orange} stroke={C.orangeDark} strokeWidth={0.7} />
      <path d={`M${cx} ${cy - 4.6 * s}V${cy + 4.6 * s}M${cx - 3 * s} ${cy - 4 * s}Q${cx - 4.6 * s} ${cy} ${cx - 3 * s} ${cy + 4 * s}M${cx + 3 * s} ${cy - 4 * s}Q${cx + 4.6 * s} ${cy} ${cx + 3 * s} ${cy + 4 * s}`} stroke={C.orangeDark} strokeWidth={0.6} fill="none" />
      <path d={`M${cx} ${cy - 4.4 * s}Q${cx + 0.4 * s} ${cy - 6.6 * s} ${cx + 1.8 * s} ${cy - 7 * s}`} stroke={C.leafGreen} strokeWidth={1.3} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Scarecrow() {
  return (
    <g>
      <path d="M340 172V106M316 124H364" stroke={C.woodDark} strokeWidth={3} strokeLinecap="round" />
      {/* straw tufts at the cuffs and hem */}
      <path d="M318 124L311 120M318 124L310 125M318 124L312 129M362 124L369 120M362 124L370 125M362 124L368 129" stroke={C.wheat} strokeWidth={1.2} strokeLinecap="round" />
      {/* plaid shirt */}
      <path className={styles.shirt} d="M320 120H360L362 128H350L352 148H328L330 128H318Z" fill={C.orange} stroke={C.outline} strokeWidth={0.6} />
      <path d="M326 122V146M334 120V148M346 120V148M354 122V146M320 126H360M330 136H350M328 144H352" stroke={C.redDark} strokeWidth={0.8} opacity={0.6} />
      <rect x={336} y={130} width={8} height={7} fill={C.leafGreen} stroke={C.outline} strokeWidth={0.5} />
      <path d="M332 148L330 154M338 148L337 155M344 148L345 154M350 148L352 153" stroke={C.wheat} strokeWidth={1.2} strokeLinecap="round" />
      {/* burlap head, stitched smile, straw hat */}
      <circle cx={340} cy={110} r={8} fill={C.acornLight} stroke={C.outline} strokeWidth={0.6} />
      <path d="M336 108l1.6 1.6M337.6 108l-1.6 1.6M342.4 108l1.6 1.6M344 108l-1.6 1.6" stroke={C.capDark} strokeWidth={0.8} />
      <path d="M335.5 113.5Q340 117 344.5 113.5" stroke={C.capDark} strokeWidth={0.8} fill="none" strokeDasharray="1.2 0.8" />
      <ellipse cx={340} cy={103} rx={14} ry={2.8} fill={C.wheatDark} stroke={C.outline} strokeWidth={0.6} />
      <path d="M332 103Q333 94 340 93Q347 94 348 103Z" fill={C.wheat} stroke={C.outline} strokeWidth={0.6} />
      <path d="M332.6 100.5H347.4" stroke={C.red} strokeWidth={1.4} />
      {/* a crow keeping it company */}
      <g className={styles.crow}>
        <path d="M362 121Q364 114 370 114L374 112L371 116Q372 121 366 122Z" fill={LAND.crow} />
        <path d="M374 112.6L377 113.4L374 114.2Z" fill={C.gold} />
      </g>
    </g>
  );
}

/** Harvest festival at golden hour: barn and silo, rolling fields, a scarecrow, hay bales, leaves. */
export function AutumnScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx={200} cy={130} r={34} fill={C.orange} opacity={0.32} />
        <circle cx={200} cy={130} r={22} fill={C.gold} opacity={0.42} />
        <g className={styles.birds} stroke={LAND.crow} strokeWidth={1.3} fill="none" strokeLinecap="round">
          <path d="M150 62q4-4 8 0q4-4 8 0" />
          <path d="M172 52q3-3 6 0q3-3 6 0" />
        </g>
        <path d="M0 134Q60 114 130 126T260 122T400 120V180H0Z" fill={LAND.far} opacity={0.75} />
        <path d="M0 148Q80 130 170 144Q250 156 320 138Q370 128 400 134V180H0Z" fill={LAND.mid} />
        <g stroke={C.wheat} strokeWidth={1} opacity={0.3} fill="none">
          <path d="M150 150Q210 156 270 146" />
          <path d="M140 157Q210 164 290 152" />
          <path d="M130 164Q210 172 310 158" />
        </g>
        <path d="M0 160Q100 150 200 162Q300 172 400 156V180H0Z" fill={LAND.near} />
        <Barn />
        <RoundBale cx={190} cy={162} r={9} />
        <RoundBale cx={208} cy={165} r={7} />
        {/* stacked square bales */}
        <g stroke={C.wheatDark} strokeWidth={0.7}>
          <rect x={262} y={152} width={30} height={13} rx={1.5} fill={C.wheat} />
          <rect x={292} y={154} width={22} height={11} rx={1.5} fill={C.wheat} />
          <rect x={270} y={140} width={26} height={12} rx={1.5} fill={C.wheat} />
          <path d="M272 152V165M284 152V165M300 154V165M306 154V165M278 140V152M290 140V152" stroke={C.woodDark} />
        </g>
        <Scarecrow />
        <Pumpkin cx={318} cy={168} s={1.2} />
        <Pumpkin cx={366} cy={169} s={0.9} />
        <Pumpkin cx={226} cy={168} s={0.7} />
        {DRIFTING.map(([x, y, rot, fill, delay]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <path className={styles.driftLeaf} style={{ animationDelay: `${delay}s` }} d={LEAF_PATH} fill={fill} stroke={C.outline} strokeWidth={0.5} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Wreath leaves around the emblem as [angle deg, colour]. */
const WREATH: readonly (readonly [number, string])[] = [
  [-150, C.red], [-115, C.gold], [-80, C.orange], [-45, C.red], [-10, C.gold], [25, C.orange],
  [60, C.red], [95, C.gold], [130, C.orange], [165, C.red], [200, C.gold],
];

/** A harvest wreath of autumn leaves behind the emblem badge. */
export function AutumnHeaderDecor() {
  return (
    <svg viewBox="0 0 100 100" className={styles.headerWreath}>
      <circle cx={50} cy={50} r={40} stroke={C.bark} strokeWidth={2} fill="none" />
      {WREATH.map(([angle, fill]) => (
        <g key={angle} transform={`rotate(${angle} 50 50) translate(50 10) rotate(70)`}>
          <path d="M0 -8Q6.5 -3 0 8Q-6.5 -3 0 -8Z" fill={fill} stroke={C.outline} strokeWidth={0.6} />
          <path d="M0 -6V7" stroke={C.outline} strokeWidth={0.5} />
        </g>
      ))}
      <circle cx={14} cy={70} r={3} fill={C.apple} stroke={C.redDark} strokeWidth={0.6} />
      <circle cx={86} cy={72} r={2.6} fill={C.acorn} stroke={C.acornDark} strokeWidth={0.6} />
    </svg>
  );
}
