import { WINTER_PALETTE as C } from '@/presentation/components/hud/skins/winter/winter-palette';
import styles from './winter-lobby.module.css';

/** Scene-only colours. */
const MOUNTAIN = '#2a4370';
const MOUNTAIN_FAR = '#1d3158';
const WINDOW = '#ffcf6b';

/** Pines as [x, baseY, height]. */
const PINES: readonly (readonly [number, number, number])[] = [
  [18, 168, 52],
  [44, 166, 66],
  [72, 170, 44],
  [100, 172, 30],
];

/** Chimney smoke puffs as [radius, delay s]. */
const PUFFS: readonly (readonly [number, number])[] = [
  [4, 0],
  [5.5, 1.3],
  [7, 2.6],
];

/** Pine tiers: offset of each tier's tip from the tree top, as a fraction of the height. */
const PINE_TIERS = [0, 0.29, 0.55];
/** Height of one tier as a fraction of the tree height. */
const PINE_TIER_HEIGHT = 0.42;

/** A three-tier pine whose base sits on (x, y), each tier capped with snow. */
function Pine({ x, y, h }: { x: number; y: number; h: number }) {
  const tierH = h * PINE_TIER_HEIGHT;
  return (
    <g>
      <rect x={x - 1.5} y={y - 4} width={3} height={7} fill={C.woodDark} />
      {PINE_TIERS.map((t) => {
        const top = y - 3 - h + t * h;
        const bottom = top + tierH;
        const half = h * (0.14 + t * 0.26);
        const capY = top + tierH * 0.45;
        return (
          <g key={t}>
            <path d={`M${x} ${top}L${x + half} ${bottom}H${x - half}Z`} fill={C.firDark} />
            <path d={`M${x} ${top}L${x + half * 0.45} ${capY}Q${x} ${capY + tierH * 0.12} ${x - half * 0.45} ${capY}Z`} fill={C.snow} opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
}

function Cabin() {
  return (
    <g>
      {/* chimney + smoke */}
      <rect x={346} y={92} width={9} height={22} fill={C.coal} />
      <path d="M344 92h13" stroke={C.snow} strokeWidth={3} strokeLinecap="round" />
      {PUFFS.map(([r, delay]) => (
        <circle key={r} className={styles.smoke} cx={350} cy={84} r={r} fill={C.snowShade} style={{ animationDelay: `${delay}s` }} />
      ))}
      {/* log walls */}
      <rect x={290} y={122} width={82} height={44} fill={C.wood} />
      <path d="M290 130h82M290 138h82M290 146h82M290 154h82M290 162h82" stroke={C.woodDark} strokeWidth={1.4} />
      {/* windows + door */}
      <rect x={298} y={132} width={14} height={12} fill={WINDOW} className={styles.windowGlow} />
      <path d="M305 132v12M298 138h14" stroke={C.woodDark} strokeWidth={1.2} />
      <rect x={350} y={132} width={14} height={12} fill={WINDOW} className={styles.windowGlow} />
      <path d="M357 132v12M350 138h14" stroke={C.woodDark} strokeWidth={1.2} />
      <rect x={322} y={138} width={16} height={28} rx={1} fill={C.woodDark} />
      <circle cx={334} cy={153} r={1} fill={C.gold} />
      {/* roof with a thick snow load */}
      <path d="M280 124L331 94L382 124Z" fill={C.redDark} />
      <path d="M278 125Q282 118 288 120L331 94L374 120Q380 118 384 125Q378 129 372 125Q366 130 358 125Q350 130 342 125Q334 130 326 125Q318 130 310 125Q302 130 294 125Q286 130 278 125Z" fill={C.snow} />
      <path d="M331 94L288 120M331 94L374 120" stroke={C.snowShade} strokeWidth={1} />
    </g>
  );
}

/** Alpine lodge at night: mountains, snowy pines, a log cabin with glowing windows and chimney smoke. */
export function WinterScene() {
  return (
    <div className={styles.sceneNight}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <path d="M0 140L40 112L78 128L130 92L176 124L214 104L262 130L310 100L360 120L400 106V180H0Z" fill={MOUNTAIN_FAR} opacity={0.8} />
        <path d="M130 92L118 102L126 101L134 106L140 100Z M310 100L300 108L308 107L316 111L320 106Z" fill={C.snowShade} opacity={0.7} />
        <path d="M0 150L60 130L110 146L170 122L230 146L290 128L340 140L400 124V180H0Z" fill={MOUNTAIN} />
        <path d="M0 162Q80 146 180 160Q280 172 400 154V180H0Z" fill={C.snowShade} />
        <path d="M0 170Q100 160 200 170Q300 178 400 166V180H0Z" fill={C.snow} />
        {PINES.map(([x, y, h]) => <Pine key={x} x={x} y={y} h={h} />)}
        <Cabin />
        <path d="M262 168l14-6M262 168h20q4 0 5-3" stroke={C.red} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** A snow cap settled on the emblem badge with two icicles under it. */
export function WinterHeaderDecor() {
  return (
    <>
      <svg viewBox="0 0 60 12" preserveAspectRatio="none" className={styles.badgeSnow}>
        <path d="M2 10Q0 4 6 4Q8 0 14 2Q20 -1 26 2Q32 0 38 2Q44 -1 50 2Q56 1 57 5Q61 8 58 10Q50 7 44 10Q36 8 30 11Q22 8 16 11Q8 8 2 10Z" fill={C.snow} />
        <path d="M6 6Q20 3 30 5Q42 3 54 6" stroke={C.snowShade} strokeWidth={0.8} fill="none" />
      </svg>
      <svg viewBox="0 0 20 10" className={styles.badgeIcicles}>
        <path d="M2 0L4 8L6 0ZM13 0L15 6L17 0Z" fill={C.ice} stroke={C.iceDark} strokeWidth={0.4} />
      </svg>
    </>
  );
}
