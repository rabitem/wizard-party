import { Leaf } from '@/presentation/components/hud/skins/solarpunk/solarpunk-icons';
import { SOLARPUNK_PALETTE as C } from '@/presentation/components/hud/skins/solarpunk/solarpunk-palette';
import styles from './solarpunk-lobby.module.css';

/** Scene-only colours not in the HUD palette. */
const CITY = { far: '#2f6266', mid: '#24504a', ground: '#1f4a30', terrace: '#2e6a3c', tower: '#e9dfc4', towerShade: '#b9ab88' };

/** Distant terraced towers as [x, width, top]. */
const FAR_TOWERS: readonly (readonly [number, number, number])[] = [
  [112, 14, 110], [176, 12, 96], [204, 16, 118], [262, 12, 104], [322, 14, 116],
];

/** A geodesic glass dome on a brass ring, trees growing inside. */
function GlassDome({ cx, base, rx, ry, trees }: { cx: number; base: number; rx: number; ry: number; trees: readonly (readonly [number, number, number])[] }) {
  const top = base - ry;
  return (
    <g>
      {trees.map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x} ${base}V${y + r * 0.6}`} stroke={C.soil} strokeWidth={1.4} />
          <circle cx={x} cy={y} r={r} fill={C.fern} opacity={0.9} />
          <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.45} fill={C.leafLight} opacity={0.5} />
        </g>
      ))}
      <path d={`M${cx - rx} ${base}A${rx} ${ry} 0 0 1 ${cx + rx} ${base}Z`} fill={C.glass} opacity={0.18} />
      <g stroke={C.glassRim} strokeWidth={0.8} fill="none" opacity={0.85}>
        <path d={`M${cx - rx} ${base}A${rx} ${ry} 0 0 1 ${cx + rx} ${base}`} strokeWidth={1.4} />
        <path d={`M${cx - rx * 0.5} ${base}Q${cx - rx * 0.5} ${top + ry * 0.1} ${cx} ${top}Q${cx + rx * 0.5} ${top + ry * 0.1} ${cx + rx * 0.5} ${base}`} />
        <path d={`M${cx} ${top}V${base}`} />
        <path d={`M${cx - rx * 0.86} ${base - ry * 0.5}Q${cx} ${base - ry * 0.62} ${cx + rx * 0.86} ${base - ry * 0.5}`} />
        <path d={`M${cx - rx * 0.97} ${base - ry * 0.22}Q${cx} ${base - ry * 0.3} ${cx + rx * 0.97} ${base - ry * 0.22}`} />
      </g>
      <path className={styles.domeGlint} d={`M${cx - rx * 0.62} ${base - ry * 0.55}Q${cx - rx * 0.45} ${top + ry * 0.15} ${cx - rx * 0.1} ${top + ry * 0.04}`} stroke={C.white} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <rect x={cx - rx - 3} y={base - 1} width={rx * 2 + 6} height={4} rx={1.4} fill={C.brass} stroke={C.brassDark} strokeWidth={0.6} />
    </g>
  );
}

/** A tower with planted balconies spilling greenery down its face. */
function GardenTower({ x, top, w }: { x: number; top: number; w: number }) {
  const floors = [top + 10, top + 24, top + 38, top + 52];
  return (
    <g>
      <rect x={x} y={top} width={w} height={170 - top} fill={CITY.tower} stroke={C.outline} strokeWidth={0.5} />
      <rect x={x + w * 0.62} y={top} width={w * 0.38} height={170 - top} fill={CITY.towerShade} opacity={0.6} />
      <path d={`M${x - 2} ${top}H${x + w + 2}`} stroke={C.brass} strokeWidth={2} />
      {floors.map((y) => (
        <g key={y}>
          <rect x={x + 3} y={y - 6} width={w - 6} height={4} fill={C.panelCell} opacity={0.55} />
          <path d={`M${x - 2} ${y}H${x + w + 2}`} stroke={C.brassDark} strokeWidth={1.2} />
          <path d={`M${x - 3} ${y}Q${x + w * 0.25} ${y + 5} ${x + w * 0.5} ${y}Q${x + w * 0.75} ${y + 6} ${x + w + 3} ${y}`} fill={C.leaf} stroke={C.leafDark} strokeWidth={0.5} />
          <path d={`M${x + 2} ${y + 2}v5M${x + w - 4} ${y + 2}v7`} stroke={C.fern} strokeWidth={1.1} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

/** A wind turbine; the transparent disc keeps the rotor's box centred on the hub for spinning. */
function Turbine({ x, hub, blade, delay }: { x: number; hub: number; blade: number; delay: number }) {
  return (
    <g>
      <path d={`M${x - 1.6} 172L${x - 0.8} ${hub}H${x + 0.8}L${x + 1.6} 172Z`} fill={C.cream} stroke={C.outline} strokeWidth={0.4} />
      <g className={styles.rotor} style={{ animationDelay: `${delay}s` }}>
        <circle cx={x} cy={hub} r={blade} fill="transparent" />
        {[0, 120, 240].map((a) => (
          <path key={a} d={`M${x} ${hub}L${x - 1.6} ${hub - blade * 0.3}L${x} ${hub - blade}L${x + 1} ${hub - blade * 0.3}Z`} fill={C.white} stroke={C.outline} strokeWidth={0.4} transform={`rotate(${a} ${x} ${hub})`} />
        ))}
        <circle cx={x} cy={hub} r={1.8} fill={C.brass} stroke={C.brassDark} strokeWidth={0.5} />
      </g>
    </g>
  );
}

/** A tilted triangular solar sail on a brass mast. */
function SolarSail({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  const s = flip ? -1 : 1;
  return (
    <g>
      <path d={`M${x} ${y}V${y + 26}`} stroke={C.brassDark} strokeWidth={1.4} />
      <path d={`M${x} ${y}L${x + 22 * s} ${y + 10}L${x} ${y + 18}Z`} fill={C.panel} stroke={C.brass} strokeWidth={0.9} strokeLinejoin="round" />
      <path d={`M${x + 7 * s} ${y + 3}V${y + 15.4}M${x + 14 * s} ${y + 6.4}V${y + 12.6}M${x} ${y + 9}L${x + 22 * s} ${y + 10}`} stroke={C.panelCell} strokeWidth={0.6} />
    </g>
  );
}

/** Greenhouse commons on a bright day: glass domes, garden towers, solar sails, turbines, birds. */
export function SolarpunkScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx={200} cy={112} r={34} fill={C.brassLight} opacity={0.22} />
        <circle cx={200} cy={112} r={20} fill={C.brassLight} opacity={0.32} />
        <g className={styles.birds} stroke={C.ink} strokeWidth={1.2} fill="none" strokeLinecap="round">
          <path d="M138 56q4-4 8 0q4-4 8 0" />
          <path d="M160 46q3-3 6 0q3-3 6 0" />
          <path d="M246 60q3-3 6 0q3-3 6 0" />
        </g>
        {FAR_TOWERS.map(([x, w, top]) => (
          <g key={x} fill={CITY.far} opacity={0.75}>
            <rect x={x} y={top} width={w} height={170 - top} />
            <ellipse cx={x + w / 2} cy={top} rx={w * 0.7} ry={4} fill={C.fern} opacity={0.8} />
          </g>
        ))}
        <path d="M0 150Q100 138 200 148Q300 158 400 144V180H0Z" fill={CITY.mid} />
        <GardenTower x={140} top={98} w={22} />
        <SolarSail x={232} y={116} />
        <SolarSail x={268} y={122} flip />
        <GlassDome cx={70} base={164} rx={60} ry={50} trees={[[48, 140, 10], [74, 128, 14], [98, 142, 9]]} />
        <GlassDome cx={300} base={166} rx={32} ry={26} trees={[[292, 152, 7], [308, 148, 8]]} />
        <Turbine x={352} hub={92} blade={18} delay={0} />
        <Turbine x={384} hub={108} blade={13} delay={-1.3} />
        <path d="M0 166Q120 158 220 168Q320 176 400 164V180H0Z" fill={CITY.ground} />
        <path d="M150 180Q190 168 250 170" stroke={C.cream} strokeWidth={2} opacity={0.3} fill="none" />
        <Leaf x={8} y={178} length={18} angle={20} color={C.fern} />
        <Leaf x={14} y={178} length={14} angle={50} />
        <Leaf x={396} y={178} length={16} angle={-30} color={C.fern} />
        <Leaf x={388} y={178} length={12} angle={-60} />
      </svg>
    </div>
  );
}

/** A riveted brass ring around the emblem badge with an ivy sprig curling over a corner. */
export function SolarpunkHeaderDecor() {
  return (
    <>
      <span className={styles.badgeSun} />
      <span className={styles.badgeRing} />
      <svg viewBox="0 0 30 22" className={styles.badgeSprig}>
        <path d="M2 20Q10 12 28 4" stroke={C.leafDark} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        <Leaf x={8} y={15} length={8} angle={-20} />
        <Leaf x={14} y={11} length={7} angle={70} color={C.leafLight} />
        <Leaf x={21} y={7.4} length={6} angle={-10} color={C.fern} />
      </svg>
    </>
  );
}
