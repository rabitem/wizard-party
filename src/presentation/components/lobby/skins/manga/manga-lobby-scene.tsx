import { burstPath } from '@/presentation/components/hud/skins/manga/manga-icons';
import { MANGA_PALETTE as C } from '@/presentation/components/hud/skins/manga/manga-palette';
import styles from './manga-lobby.module.css';

/** Rounds to 1 decimal so generated path data stays short. */
const r1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Focus lines ("concentration lines") of the centre panel: thin wedges from an outer ellipse in
 * towards an empty inner ellipse where the title sits.
 */
const FOCUS_LINES = Array.from({ length: 34 }, (_, i) => {
  const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.03;
  const spread = 0.022 + (i % 4) * 0.008;
  const inner = 1 + (i % 5) * 0.09;
  const [cx, cy, ox, oy, ix, iy] = [200, 112, 78, 96, 46 * inner, 30 * inner];
  const p1 = `${r1(cx + ox * Math.cos(a - spread))} ${r1(cy + oy * Math.sin(a - spread))}`;
  const p2 = `${r1(cx + ox * Math.cos(a + spread))} ${r1(cy + oy * Math.sin(a + spread))}`;
  const tip = `${r1(cx + ix * Math.cos(a))} ${r1(cy + iy * Math.sin(a))}`;
  return `M${p1}L${tip}L${p2}Z`;
}).join('');

/** The sound-effect burst of the right panel. */
const SFX_BURST = burstPath(338, 122, [50, 36], [33, 23], 15);
const SFX_SHADOW = burstPath(343, 127, [50, 36], [33, 23], 15);

/** Panel frames of the page spread (slanted gutters between them). */
const PANELS = ['M4 6H124L112 186H4Z', 'M130 6H270L282 186H118Z', 'M276 6H396V186H288Z'];

/** Left panel: the setting sun behind a dojo roof, a lone fighter on the ridge, headband flying. */
function DojoRooftop() {
  return (
    <g>
      <circle cx={62} cy={112} r={36} fill={C.red} opacity={0.7} />
      <circle cx={62} cy={112} r={26} fill={C.yellow} opacity={0.35} />
      {/* sunset streaks over the sun */}
      <path d="M8 98H120M8 106H118M8 114H117" stroke={C.ink} strokeWidth={1.4} opacity={0.35} />
      {/* fighter on the ridge (a generic silhouette) */}
      <g fill={C.ink}>
        <circle cx={70} cy={100} r={4.2} />
        <path d="M64.5 125L66 108Q70 103.5 74 108L76.5 125Z" />
        <path d="M66 110L58 117L59.5 118.5L67 113Z" />
        <path d="M74 110L81 104L82.5 105.5L75 113Z" />
      </g>
      <path className={styles.headband} d="M73.6 99Q80 97 88 100.5Q81 99.8 74.2 101.2Z" fill={C.red} stroke={C.halo} strokeWidth={0.4} />
      {/* roof: ridge cap, flaring eaves, tiles */}
      <path d="M2 152Q32 144 42 126H98Q108 144 122 152L120 156Q90 150 70 150Q50 150 4 156Z" fill={C.ink} stroke={C.halo} strokeWidth={0.8} />
      <rect x={38} y={122} width={64} height={5} rx={1.5} fill={C.inkSoft} stroke={C.halo} strokeWidth={0.6} />
      <path d="M38 124q-5-1-6-6M102 124q5-1 6-6" stroke={C.halo} strokeWidth={1.2} fill="none" />
      <path d="M50 131L42 150M60 131L56 150M70 131V150M80 131L84 150M90 131L98 150" stroke={C.paper} strokeWidth={0.6} opacity={0.3} />
      {/* wall with sliding screens */}
      <rect x={16} y={156} width={94} height={30} fill={C.ink} />
      <path d="M22 160H104V186M22 160V186M42 160V186M63 160V186M84 160V186M22 170H104" stroke={C.paperShade} strokeWidth={0.7} opacity={0.35} fill="none" />
    </g>
  );
}

/** Right panel: horizontal motion streaks with a big inked "DON!" burst. */
function SoundEffect() {
  return (
    <g>
      <g stroke={C.paper} strokeWidth={1} opacity={0.3} strokeLinecap="round">
        <path d="M292 60H392M300 72H388M296 168H384M306 178H392M290 154H340M352 48H394" />
      </g>
      <g className={styles.sfx}>
        <path d={SFX_SHADOW} fill={C.red} />
        <path d={SFX_BURST} fill={C.yellow} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
        <text
          x={338}
          y={131}
          textAnchor="middle"
          transform="rotate(-9 338 122)"
          fontSize={27}
          fontWeight={900}
          fontStyle="italic"
          fontFamily="Impact, 'Arial Black', system-ui, sans-serif"
          fill={C.red}
          stroke={C.ink}
          strokeWidth={1.6}
          paintOrder="stroke"
          letterSpacing={1}
        >
          DON!
        </text>
      </g>
    </g>
  );
}

/** Falling cherry petals across the spread. */
const PETALS: readonly (readonly [number, number, number])[] = [
  [150, 40, 0],
  [252, 70, -2.4],
  [110, 60, -4.1],
  [300, 30, -1.3],
];

/**
 * A manga page spread at sunset: three inked panels split by slanted paper gutters - a dojo
 * rooftop on the left, focus lines in the middle (behind the title), a sound-effect burst right.
 */
export function MangaScene() {
  return (
    <div className={styles.sceneSky}>
      <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full">
        <path d={FOCUS_LINES} fill={C.paper} opacity={0.22} className={styles.focusLines} />
        <DojoRooftop />
        <SoundEffect />
        <g fill={C.blush} opacity={0.85}>
          {PETALS.map(([x, y, delay]) => (
            <path
              key={x}
              className={styles.petal}
              style={{ animationDelay: `${delay}s` }}
              d={`M${x} ${y}q3-3 6 0q-3 3-6 0Z`}
            />
          ))}
        </g>
        {/* gutters: paper bands between the panels, ink frame lines around each panel */}
        <path d="M0 0H400V6H0ZM0 0H4V186H0ZM396 0H400V186H396ZM124 6H130L118 186H112ZM270 6H276L288 186H282Z" fill={C.paper} opacity={0.8} />
        {PANELS.map((d) => <path key={d} d={d} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />)}
      </svg>
    </div>
  );
}

/** A red comic burst flaring behind the emblem badge, with an inked rim. */
const BADGE_BURST = burstPath(50, 50, [49, 49], [36, 36], 16);

export function MangaHeaderDecor() {
  return (
    <svg viewBox="0 0 100 100" className={styles.badgeBurst}>
      <path d={BADGE_BURST} fill={C.red} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={BADGE_BURST} fill="none" stroke={C.paper} strokeWidth={0.8} opacity={0.7} transform="translate(5 5) scale(0.9)" />
    </svg>
  );
}
