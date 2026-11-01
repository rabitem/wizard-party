import { Blossom } from '@/presentation/components/hud/skins/spring/spring-icons';
import { SPRING_PALETTE as C } from '@/presentation/components/hud/skins/spring/spring-palette';
import styles from './spring-lobby.module.css';

/** Scene-only colours not in the HUD palette. */
const GARDEN = { hills: '#4c8a52', meadow: '#356b3a', meadowDark: '#26502b', pond: '#2f7590', pondLight: '#7cc6dc', bridge: '#d0483a', bridgeDark: '#8a2a22' };

/** Blossom canopy puffs as [cx, cy, r, colour]. */
const CANOPY_LEFT: readonly (readonly [number, number, number, string])[] = [
  [40, 70, 22, C.blossomDark],
  [76, 62, 24, C.blossom],
  [20, 92, 18, C.blossom],
  [106, 82, 18, C.blossomDark],
  [58, 90, 20, C.blossomLight],
  [92, 100, 14, C.blossom],
  [30, 52, 14, C.blossomLight],
];

const CANOPY_RIGHT: readonly (readonly [number, number, number, string])[] = [
  [366, 92, 16, C.blossomDark],
  [390, 84, 18, C.blossom],
  [350, 108, 12, C.blossomLight],
  [384, 108, 13, C.blossom],
];

/** Falling petals as [x, y, rotation, delay s]. */
const PETALS: readonly (readonly [number, number, number, number])[] = [
  [130, 50, 30, 0],
  [160, 80, -20, 2.2],
  [118, 104, 60, 4.4],
  [334, 70, -40, 1.4],
  [208, 36, 10, 3.6],
  [300, 46, 80, 5.4],
];

function CherryTree({ canopy, trunk }: { canopy: typeof CANOPY_LEFT; trunk: string }) {
  return (
    <g>
      <path d={trunk} stroke={C.barkDark} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d={trunk} stroke={C.bark} strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <g className={styles.canopy}>
        {canopy.map(([cx, cy, r, fill]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={fill} opacity={0.88} />)}
        {canopy.map(([cx, cy, r]) => <Blossom key={`b${cx}-${cy}`} cx={cx + r * 0.3} cy={cy - r * 0.3} size={2.6} color={C.white} rim={C.blossomDark} />)}
      </g>
    </g>
  );
}

function ArchedBridge() {
  return (
    <g>
      {/* reflection */}
      <path d="M224 162Q273 192 322 162" stroke={GARDEN.bridge} strokeWidth={4} fill="none" opacity={0.22} />
      {/* deck, posts and hand rail */}
      <path d="M220 162Q273 124 326 162" stroke={GARDEN.bridgeDark} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M220 161Q273 123 326 161" stroke={GARDEN.bridge} strokeWidth={3.6} fill="none" strokeLinecap="round" />
      <g stroke={GARDEN.bridge} strokeWidth={1.8} strokeLinecap="round">
        <path d="M230 154V144M242 147V136M256 142V131M273 140V129M290 142V131M304 147V136M316 154V144" />
      </g>
      <path d="M228 144Q273 112 318 144" stroke={GARDEN.bridge} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <circle cx={228} cy={144} r={1.8} fill={C.yellow} />
      <circle cx={318} cy={144} r={1.8} fill={C.yellow} />
    </g>
  );
}

function Butterfly({ x, y, wing, rim, delay }: { x: number; y: number; wing: string; rim: string; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={styles.butterfly} style={{ animationDelay: `${delay}s` }}>
        <g className={styles.wings} style={{ animationDelay: `${delay}s` }}>
          <path d="M0 0Q-7 -8 -8 -2Q-8 2 0 1Z" fill={wing} stroke={rim} strokeWidth={0.5} />
          <path d="M0 0Q7 -8 8 -2Q8 2 0 1Z" fill={wing} stroke={rim} strokeWidth={0.5} />
          <path d="M0 1Q-5 6 -3 7Q-1 7 0 2Z" fill={wing} stroke={rim} strokeWidth={0.5} />
          <path d="M0 1Q5 6 3 7Q1 7 0 2Z" fill={wing} stroke={rim} strokeWidth={0.5} />
        </g>
        <path d="M0 -3V5" stroke={C.ink} strokeWidth={1.2} strokeLinecap="round" />
        <path d="M0 -3l-2 -2.4M0 -3l2 -2.4" stroke={C.ink} strokeWidth={0.5} />
      </g>
    </g>
  );
}

/** Blossom garden in the morning: cherry trees, a red arched bridge over a lily pond, butterflies. */
export function SpringScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <circle cx={200} cy={118} r={28} fill={C.yellow} opacity={0.22} />
        <path d="M0 140Q70 118 150 132Q230 146 300 126Q360 112 400 124V180H0Z" fill={GARDEN.hills} opacity={0.7} />
        <path d="M0 156Q100 144 200 154Q300 164 400 150V180H0Z" fill={GARDEN.meadow} />
        <ellipse cx={273} cy={166} rx={84} ry={11} fill={GARDEN.pond} />
        <path className={styles.ripple} d="M210 164q8-2 16 0M300 168q8-2 16 0M248 172q6-1.6 12 0" stroke={GARDEN.pondLight} strokeWidth={0.9} fill="none" opacity={0.6} />
        <ArchedBridge />
        {/* lily pads */}
        <g fill={C.leaf} stroke={C.leafDark} strokeWidth={0.5}>
          <path d="M204 168a6 2.6 0 1 0 1 -2.6L205 168Z" />
          <path d="M334 166a7 2.8 0 1 0 1 -2.8L335 166Z" />
          <path d="M350 171a5 2.2 0 1 0 1 -2.2L351 171Z" />
        </g>
        <Blossom cx={336} cy={164} size={2.2} color={C.blossomLight} rim={C.blossomDark} />
        <path d="M0 164Q90 156 180 166L196 180H0Z" fill={GARDEN.meadowDark} />
        <CherryTree canopy={CANOPY_LEFT} trunk="M62 178Q60 140 64 110M63 128Q44 112 34 90M64 116Q84 100 96 84M64 110Q66 90 74 70" />
        <CherryTree canopy={CANOPY_RIGHT} trunk="M376 168Q374 140 378 112M377 128Q392 118 396 104M377 124Q362 116 356 108" />
        {/* tulip row */}
        {[124, 136, 148, 160].map((x, i) => (
          <g key={x}>
            <path d={`M${x} 178V${166 - (i % 2) * 3}`} stroke={C.stem} strokeWidth={1.2} />
            <path d={`M${x - 3} ${164 - (i % 2) * 3}l1.5 -4l1.5 2.4l1.5 -2.4l1.5 4Q${x} ${168 - (i % 2) * 3} ${x - 3} ${164 - (i % 2) * 3}Z`} fill={i % 2 ? C.tulipPurple : C.tulipRed} stroke={C.outline} strokeWidth={0.5} />
          </g>
        ))}
        <Butterfly x={150} y={62} wing={C.yellow} rim={C.yellowDark} delay={0} />
        <Butterfly x={256} y={88} wing={C.tulipPurple} rim={C.tulipPurpleDark} delay={1.8} />
        <Butterfly x={318} y={52} wing={C.water} rim={C.canDark} delay={3.1} />
        {PETALS.map(([x, y, rot, delay]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <path className={styles.petal} style={{ animationDelay: `${delay}s` }} d="M0 -3Q3 0 0 3Q-3 0 0 -3Z" fill={C.blossomLight} stroke={C.blossomDark} strokeWidth={0.4} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A blossoming cherry twig draped over the emblem badge's top-left corner. */
export function SpringHeaderDecor() {
  return (
    <>
      <span className={styles.badgeHalo} />
      <svg viewBox="0 0 40 26" className={styles.badgeBranch}>
        <path d="M2 24Q10 10 38 4M14 13Q16 6 22 3" stroke={C.barkDark} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <path d="M28 6Q32 1 36 2Q33 6 28 6Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.5} />
        <Blossom cx={9} cy={15} size={4.6} />
        <Blossom cx={21} cy={5} size={3.8} color={C.blossomLight} />
        <Blossom cx={31} cy={8} size={3.2} />
      </svg>
    </>
  );
}
