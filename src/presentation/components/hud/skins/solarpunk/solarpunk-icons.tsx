import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { SOLARPUNK_PALETTE as C } from './solarpunk-palette';

/*
 * Solarpunk HUD icons (greenhouse leaves, brass fittings, solar glass), drawn on a 24x24 grid
 * like lucide so they drop into the same w-4/w-5/w-6 slots. Full colour (they ignore the text
 * colour), no ids (many copies render at once), and every shape gets a thin dark outline.
 */

function SolarpunkSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Rounds to 2 decimals so generated path data stays short. */
const r2 = (value: number): number => Math.round(value * 100) / 100;

/** A pointed leaf of length `l`, base at the origin, pointing up. */
export function leafPath(l: number): string {
  return `M0 0C${r2(-0.5 * l)} ${r2(-0.25 * l)} ${r2(-0.45 * l)} ${r2(-0.75 * l)} 0 ${-l}`
    + `C${r2(0.45 * l)} ${r2(-0.75 * l)} ${r2(0.5 * l)} ${r2(-0.25 * l)} 0 0Z`;
}

/** A leaf with a midrib at (x, y), rotated by `angle` degrees. */
export function Leaf({ x, y, length, angle, color = C.leaf }: { x: number; y: number; length: number; angle: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={leafPath(length)} fill={color} stroke={C.leafDark} strokeWidth={0.8} />
      <path d={`M0 -.5V${r2(-0.8 * length)}`} stroke={C.leafDark} strokeWidth={0.8} opacity={0.45} />
    </g>
  );
}

/** One curved leaf of the recycling loop (outer bulge, inner bulge, midrib, stem). */
function LoopLeaf({ color }: { color: string }) {
  return (
    <g>
      <path d="M5.23 14.46l-1.3 1.7" stroke={C.leafDark} strokeWidth={1.2} />
      <path d="M5.23 14.46A6.95 6.95 0 0 1 16.13 6.1A9 9 0 0 0 5.23 14.46Z" fill={color} stroke={C.leafDark} strokeWidth={0.9} />
      <path d="M5.23 14.46A7.8 7.8 0 0 1 16.13 6.1" stroke={C.leafDark} strokeWidth={0.8} opacity={0.55} />
      <path d="M6.6 10.4A6.2 6.2 0 0 1 9.4 6.9" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
    </g>
  );
}

/** Shuffle: two curved leaves chasing each other in a recycling loop. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <LoopLeaf color={C.leaf} />
      <g transform="rotate(180 12 12)">
        <LoopLeaf color={C.leafLight} />
      </g>
    </SolarpunkSvg>
  );
}

/** A tilted solar panel (parallelogram) with a brass frame and a cell grid. */
function SolarPanel({ y, width }: { y: number; width: number }) {
  const h = 3.6;
  const skew = 1.2;
  const left = 12 - width / 2;
  const frame = `M${r2(left + skew)} ${y}H${r2(left + width + skew)}L${r2(left + width - skew)} ${y + h}H${r2(left - skew)}Z`;
  const cells = [1 / 3, 2 / 3].map((t) => {
    const x = left + t * width;
    return `M${r2(x + skew)} ${y}L${r2(x - skew)} ${y + h}`;
  });
  return (
    <g>
      <path d={frame} fill={C.panel} stroke={C.brass} strokeWidth={0.9} />
      <path d={`${cells.join('')}M${r2(left)} ${y + h / 2}H${r2(left + width)}`} stroke={C.panelCell} strokeWidth={0.8} />
      <path d={`M${r2(left + skew + 0.8)} ${y + 0.9}H${r2(left + skew + width * 0.35)}`} stroke="#ffffff" strokeWidth={0.8} opacity={0.6} />
    </g>
  );
}

/** Sort: solar panels stacked from big to small on a brass post. */
function SortIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <path d="M12 18.6V21.4M8 21.6H16" stroke={C.brassDark} strokeWidth={1.4} />
      <SolarPanel y={15} width={17} />
      <SolarPanel y={9.4} width={13} />
      <SolarPanel y={3.8} width={9} />
    </SolarpunkSvg>
  );
}

/** Chat: a leaf-shaped speech bubble with a brass rim. */
function ChatIcon({ className }: { className?: string }) {
  const bubble = 'M3.4 13.6C3.4 7.6 9.4 3.6 20.8 3.6C20.8 13 15.4 17.6 8.8 17.6C7.6 17.6 6.6 17.4 5.8 17L3 20.6L4.2 15.8C3.7 15.1 3.4 14.4 3.4 13.6Z';
  return (
    <SolarpunkSvg className={className}>
      <path d={bubble} fill={C.leaf} stroke={C.outline} strokeWidth={2.4} />
      <path d={bubble} stroke={C.brass} strokeWidth={1.2} />
      <path d="M6.6 15Q12 11.6 19.2 5.2" stroke={C.leafDark} strokeWidth={0.9} />
      <path d="M9.6 12.8L9.4 9.4M13 10.6L13.4 7.4M16 8.2L16.6 5.8M10 12.6L13 14.2M13.4 10.2L16.8 11.2" stroke={C.leafDark} strokeWidth={0.8} opacity={0.6} />
      <path d="M6 11.4Q7 7.6 10.6 6" stroke="#ffffff" strokeWidth={0.8} opacity={0.55} />
    </SolarpunkSvg>
  );
}

/** Emotes: a smiling sprout with two fresh leaves. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <path d="M12 9.2V7.4" stroke={C.leafDark} strokeWidth={1.2} />
      <Leaf x={12} y={7.6} length={7} angle={-58} />
      <Leaf x={12} y={7.6} length={6} angle={52} color={C.leafLight} />
      <circle cx={12} cy={15.2} r={6.4} fill={C.leafLight} stroke={C.leafDark} strokeWidth={0.9} />
      <circle cx={9.8} cy={14.2} r={0.85} fill={C.ink} />
      <circle cx={14.2} cy={14.2} r={0.85} fill={C.ink} />
      <path d="M9.6 16.8Q12 19 14.4 16.8" stroke={C.ink} strokeWidth={1} />
      <circle cx={8.4} cy={16.6} r={0.8} fill={C.copper} opacity={0.55} />
      <circle cx={15.6} cy={16.6} r={0.8} fill={C.copper} opacity={0.55} />
      <path d="M8 12.6A4.6 4.6 0 0 1 10 10.6" stroke="#ffffff" strokeWidth={0.8} opacity={0.6} />
    </SolarpunkSvg>
  );
}

/** A brass pot at `cx` with a plant growing up to `top`, leaves alternating up the stem. */
function PottedPlant({ cx, top }: { cx: number; top: number }) {
  const leaves: number[] = [];
  for (let y = 15.4; y > top + 1; y -= 3.2) leaves.push(y);
  return (
    <g>
      <path d={`M${cx} 17V${top}`} stroke={C.leafDark} strokeWidth={1.1} />
      {leaves.map((y, i) => (
        <Leaf key={y} x={cx} y={y} length={3.2} angle={i % 2 === 0 ? -55 : 55} />
      ))}
      <Leaf x={cx} y={top + 0.4} length={2.8} angle={0} color={C.leafLight} />
      <path d={`M${cx - 2.7} 17H${cx + 2.7}L${cx + 2} 21.4H${cx - 2}Z`} fill={C.brass} stroke={C.brassDark} strokeWidth={0.9} />
      <path d={`M${cx - 2.9} 17.2H${cx + 2.9}`} stroke={C.brassLight} strokeWidth={0.8} />
    </g>
  );
}

/** Stats: plants in brass pots growing taller left to right. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <PottedPlant cx={4.8} top={12.6} />
      <PottedPlant cx={12} top={8.2} />
      <PottedPlant cx={19.2} top={3.6} />
    </SolarpunkSvg>
  );
}

const TURBINE_BLADE = 'M0 0C-1.5-2.5-1.1-6.5 0-8.4C.9-6.5 1-2.5 0 0Z';

/** Settings: a small wind turbine on a brass tower with leaves at its foot. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <path d="M11.2 21.4L11.6 10.6H12.4L12.8 21.4Z" fill={C.cream} stroke={C.brassDark} strokeWidth={0.8} />
      <Leaf x={11.2} y={21.4} length={4} angle={-60} />
      <Leaf x={12.8} y={21.4} length={3.6} angle={60} color={C.leafLight} />
      <path d="M7.4 21.6H16.6" stroke={C.brassDark} strokeWidth={1.2} />
      {[0, 120, 240].map((angle) => (
        <path key={angle} d={TURBINE_BLADE} fill={C.cream} stroke={C.outline} strokeWidth={0.8} transform={`translate(12 10) rotate(${angle + 10})`} />
      ))}
      <circle cx={12} cy={10} r={1.7} fill={C.brass} stroke={C.brassDark} strokeWidth={0.8} />
      <circle cx={11.6} cy={9.6} r={0.45} fill={C.brassLight} />
    </SolarpunkSvg>
  );
}

/** Trophy: a glass terrarium bell jar with a fern on a brass base. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <path d="M6 19.2V11A6 6 0 0 1 18 11V19.2Z" fill={C.glass} fillOpacity={0.45} />
      <path d="M7 19.2Q12 16.4 17 19.2Z" fill={C.soil} />
      <path d="M12 18V10.6" stroke={C.leafDark} strokeWidth={0.9} />
      <Leaf x={12} y={16.6} length={3.6} angle={-60} />
      <Leaf x={12} y={14.6} length={3.4} angle={60} />
      <Leaf x={12} y={12.6} length={3} angle={-50} color={C.leafLight} />
      <Leaf x={12} y={11} length={2.4} angle={0} color={C.leafLight} />
      <path d="M6 19.2V11A6 6 0 0 1 18 11V19.2" stroke={C.glassRim} strokeWidth={1} />
      <path d="M8.2 12Q8.2 8.6 10.6 7.2" stroke="#ffffff" strokeWidth={0.9} opacity={0.75} />
      <circle cx={12} cy={4.1} r={1.2} fill={C.brass} stroke={C.brassDark} strokeWidth={0.8} />
      <rect x={4.6} y={19} width={14.8} height={2.8} rx={0.8} fill={C.brass} stroke={C.brassDark} strokeWidth={0.9} />
      <g fill={C.brassDark}>
        <circle cx={6.6} cy={20.4} r={0.5} />
        <circle cx={17.4} cy={20.4} r={0.5} />
      </g>
    </SolarpunkSvg>
  );
}

/** A brass rivet with a leaf sprouting behind it; `symbol` is engraved on top. */
function Rivet({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <SolarpunkSvg className={className}>
      <Leaf x={16.4} y={7.6} length={6} angle={40} />
      <circle cx={12} cy={13} r={8} fill={C.brass} stroke={C.brassDark} strokeWidth={1} />
      <circle cx={12} cy={13} r={6.2} stroke={C.brassLight} strokeWidth={0.8} opacity={0.7} />
      <path d="M7.2 10.4A5.4 5.4 0 0 1 10 7.8" stroke="#ffffff" strokeWidth={0.9} opacity={0.7} />
      <path d={symbol} stroke={C.ink} strokeWidth={2.4} />
    </SolarpunkSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <Rivet className={className} symbol="M8.4 13H15.6M12 9.4V16.6" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <Rivet className={className} symbol="M8.4 13H15.6" />;
}

/** One sprout on a little mound of soil. */
function Sprout({ x }: { x: number }) {
  return (
    <g>
      <ellipse cx={x} cy={15.4} rx={3.2} ry={1.3} fill={C.soil} stroke={C.outline} strokeWidth={0.8} />
      <path d={`M${x} 15V10.4`} stroke={C.leafDark} strokeWidth={1.1} />
      <Leaf x={x} y={10.8} length={4} angle={-58} />
      <Leaf x={x} y={10.8} length={3.6} angle={55} color={C.leafLight} />
    </g>
  );
}

/** Menu: three sprouts in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <SolarpunkSvg className={className}>
      <Sprout x={4.4} />
      <Sprout x={12} />
      <Sprout x={19.6} />
    </SolarpunkSvg>
  );
}

export const SOLARPUNK_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
  shuffle: ShuffleIcon,
  sort: SortIcon,
  chat: ChatIcon,
  emotes: EmotesIcon,
  stats: StatsIcon,
  settings: SettingsIcon,
  trophy: TrophyIcon,
  'bid-plus': BidPlusIcon,
  'bid-minus': BidMinusIcon,
  menu: MenuIcon,
};
