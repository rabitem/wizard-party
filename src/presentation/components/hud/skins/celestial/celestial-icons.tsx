import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { CELESTIAL_PALETTE as C } from './celestial-palette';

/*
 * Celestial HUD icons (night sky, gilded astronomy instruments), drawn on a 24x24 grid like
 * lucide so they drop into the same w-4/w-5/w-6 slots. Full colour (they ignore the text colour),
 * no ids (many copies render at once), and every shape gets a thin dark outline.
 */

function CelestialSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A star polygon with `points` tips around (cx, cy), first tip straight up. */
export function starPath(cx: number, cy: number, outer: number, inner: number, points = 5): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    parts.push(`${i === 0 ? 'M' : 'L'}${r2(cx + radius * Math.cos(angle))} ${r2(cy + radius * Math.sin(angle))}`);
  }
  return `${parts.join('')}Z`;
}

/** A four-pointed twinkle with concave sides around (cx, cy). */
export function twinklePath(cx: number, cy: number, size: number): string {
  const k = r2(size * 0.16);
  return `M${cx} ${r2(cy - size)}Q${r2(cx + k)} ${r2(cy - k)} ${r2(cx + size)} ${cy}Q${r2(cx + k)} ${r2(cy + k)} ${cx} ${r2(cy + size)}`
    + `Q${r2(cx - k)} ${r2(cy + k)} ${r2(cx - size)} ${cy}Q${r2(cx - k)} ${r2(cy - k)} ${cx} ${r2(cy - size)}Z`;
}

/** Shuffle: two planets swapping places on a shared orbit around a tiny sun. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <ellipse cx={12} cy={12} rx={8.5} ry={4} stroke={C.outline} strokeWidth={2} transform="rotate(-20 12 12)" />
      <ellipse cx={12} cy={12} rx={8.5} ry={4} stroke={C.gold} strokeWidth={0.9} transform="rotate(-20 12 12)" />
      <path d={twinklePath(12, 12, 2.6)} fill={C.sun} stroke={C.sunDark} strokeWidth={0.8} />
      <circle cx={4.96} cy={16.02} r={3} fill={C.planetBlue} stroke={C.planetBlueDark} strokeWidth={0.9} />
      <path d="M3 15.4Q5 14.6 6.9 15.6M3.4 17.4Q5.2 16.8 6.6 17.6" stroke={C.planetBlueDark} strokeWidth={0.8} opacity={0.6} />
      <circle cx={4} cy={14.9} r={0.7} fill="#ffffff" opacity={0.7} />
      <ellipse cx={19.04} cy={7.98} rx={4.4} ry={1.3} stroke={C.goldLight} strokeWidth={0.9} transform="rotate(-20 19.04 7.98)" />
      <circle cx={19.04} cy={7.98} r={2.7} fill={C.planetRose} stroke={C.planetRoseDark} strokeWidth={0.9} />
      {/* Front half of the ring passes over the planet. */}
      <ellipse
        cx={19.04}
        cy={7.98}
        rx={4.4}
        ry={1.3}
        stroke={C.goldLight}
        strokeWidth={0.9}
        pathLength={100}
        strokeDasharray="50 50"
        transform="rotate(-20 19.04 7.98)"
      />
    </CelestialSvg>
  );
}

type MoonPhase = 'full' | 'half' | 'crescent';

/** A moon disc lit from the right in the given phase. */
function Moon({ cx, cy, r, phase }: { cx: number; cy: number; r: number; phase: MoonPhase }) {
  const top = `${cx} ${cy - r}`;
  const bottom = `${cx} ${cy + r}`;
  const lit = phase === 'half'
    ? `M${top}A${r} ${r} 0 0 1 ${bottom}Z`
    : `M${top}A${r} ${r} 0 0 1 ${bottom}A${r2(r * 0.55)} ${r} 0 0 0 ${top}Z`;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={phase === 'full' ? C.moon : C.moonShade} />
      {phase === 'full' ? null : <path d={lit} fill={C.moon} />}
      <circle cx={cx} cy={cy} r={r} stroke={C.outline} strokeWidth={0.8} />
    </g>
  );
}

/** Sort: moon phases from full to crescent, each with a shrinking gold bar. */
function SortIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <Moon cx={5} cy={5.6} r={2.8} phase="full" />
      <Moon cx={5} cy={12} r={2.8} phase="half" />
      <Moon cx={5} cy={18.4} r={2.8} phase="crescent" />
      <g stroke={C.outline} strokeWidth={2.8}>
        <path d="M10.4 5.6H21M10.4 12H18M10.4 18.4H15" />
      </g>
      <g stroke={C.gold} strokeWidth={1.8}>
        <path d="M10.4 5.6H21M10.4 12H18M10.4 18.4H15" />
      </g>
    </CelestialSvg>
  );
}

/** Chat: a night-sky speech bubble holding a crescent moon. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <path
        d="M12 3.4C17 3.4 20.8 6.8 20.8 11C20.8 15.2 17 18.6 12 18.6C10.9 18.6 9.9 18.4 9 18.1L4.4 20.4L5.6 16.2C4.1 14.8 3.2 13 3.2 11C3.2 6.8 7 3.4 12 3.4Z"
        fill={C.navy}
        stroke={C.gold}
        strokeWidth={1.1}
      />
      <path d="M12.6 6.6A4.6 4.6 0 1 0 15.6 14.6A4.5 4.5 0 0 1 12.6 6.6Z" fill={C.moon} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={twinklePath(16.6, 8, 1.6)} fill={C.star} />
      <circle cx={16.4} cy={12.8} r={0.6} fill={C.star} />
    </CelestialSvg>
  );
}

const SUN_RAYS = Array.from({ length: 12 }, (_, i) => i * 30);

/** Emotes: a smiling sun face. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      {SUN_RAYS.map((angle, i) => (
        <path
          key={angle}
          d={i % 2 === 0 ? 'M12 1.2L13.4 4.8H10.6Z' : 'M12 2.6L13.1 5.2H10.9Z'}
          fill={C.sun}
          stroke={C.sunDark}
          strokeWidth={0.8}
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      <circle cx={12} cy={12} r={6.6} fill={C.gold} stroke={C.sunDark} strokeWidth={0.9} />
      <path d="M8.8 11.2Q9.7 10 10.6 11.2M13.4 11.2Q14.3 10 15.2 11.2" stroke={C.brassDark} strokeWidth={0.9} />
      <path d="M9.4 13.6Q12 16.2 14.6 13.6" stroke={C.brassDark} strokeWidth={1} />
      <circle cx={8.4} cy={13.4} r={0.9} fill={C.blush} opacity={0.6} />
      <circle cx={15.6} cy={13.4} r={0.9} fill={C.blush} opacity={0.6} />
      <path d="M8.2 9A4.6 4.6 0 0 1 10.4 7.2" stroke="#ffffff" strokeWidth={0.8} opacity={0.6} />
    </CelestialSvg>
  );
}

/** Stats: a constellation bar chart, stars on rising bars joined by a gold line. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <g fill={C.indigo} fillOpacity={0.55} stroke={C.violet} strokeWidth={0.8}>
        <rect x={3} y={14} width={4} height={7} rx={0.6} />
        <rect x={10} y={10} width={4} height={11} rx={0.6} />
        <rect x={17} y={5} width={4} height={16} rx={0.6} />
      </g>
      <path d="M5 14L12 10L19 5" stroke={C.goldLight} strokeWidth={0.9} strokeDasharray="1.4 1" />
      <path d={starPath(5, 14, 2.4, 1)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={starPath(12, 10, 2.4, 1)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={starPath(19, 5, 2.8, 1.2)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d="M2 21.6H22" stroke={C.gold} strokeWidth={1.2} />
      <circle cx={8.4} cy={4.4} r={0.6} fill={C.star} />
      <circle cx={3.6} cy={8.6} r={0.5} fill={C.star} />
    </CelestialSvg>
  );
}

const ASTROLABE_TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

/** Settings: an astrolabe with its hanging ring, scale, rete star and alidade. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <circle cx={12} cy={2.9} r={1.4} stroke={C.gold} strokeWidth={0.9} />
      <path d="M12 4.3V5" stroke={C.gold} strokeWidth={1.2} />
      <circle cx={12} cy={13} r={8.2} fill={C.midnight} stroke={C.outline} strokeWidth={2.6} />
      <circle cx={12} cy={13} r={8.2} stroke={C.gold} strokeWidth={1.6} />
      <g stroke={C.gold} strokeWidth={0.8}>
        {ASTROLABE_TICKS.map((angle) => (
          <path key={angle} d="M12 5.8V6.9" transform={`rotate(${angle} 12 13)`} />
        ))}
      </g>
      <path d={starPath(12, 13, 4.8, 1.8, 8)} fill={C.goldLight} fillOpacity={0.85} stroke={C.goldDark} strokeWidth={0.8} />
      <path d="M6.6 18.4L17.4 7.6" stroke={C.brass} strokeWidth={1.4} />
      <circle cx={12} cy={13} r={1.1} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
    </CelestialSvg>
  );
}

/** Trophy: a golden chalice with a star on its cup. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <path d="M6.4 5.6H17.6C17.6 10.6 15.2 13.4 12 13.4C8.8 13.4 6.4 10.6 6.4 5.6Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.9} />
      <path d="M11 13.3H13L12.8 17.5H11.2Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d="M7.6 20.6C7.6 18.4 9.6 17.4 12 17.4C14.4 17.4 16.4 18.4 16.4 20.6Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.9} />
      <path d="M6.6 5.8H17.4" stroke={C.goldLight} strokeWidth={0.8} />
      <path d={starPath(12, 9.1, 2.7, 1.1)} fill={C.star} stroke={C.goldDark} strokeWidth={0.8} />
      <path d="M8 7.4Q8.2 10 9.6 11.4" stroke="#ffffff" strokeWidth={0.8} opacity={0.6} />
      <path d={twinklePath(4.4, 3.4, 1.8)} fill={C.star} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={twinklePath(19.8, 2.6, 1.4)} fill={C.star} stroke={C.goldDark} strokeWidth={0.8} />
    </CelestialSvg>
  );
}

/** A four-pointed golden star around a midnight disc; `symbol` is drawn on the disc. */
function StarButton({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <CelestialSvg className={className}>
      <path d={twinklePath(12, 12, 10.4)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.9} />
      <circle cx={12} cy={12} r={5} fill={C.midnight} stroke={C.goldLight} strokeWidth={0.9} />
      <path d={symbol} stroke={C.goldLight} strokeWidth={2} />
    </CelestialSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <StarButton className={className} symbol="M9.6 12H14.4M12 9.6V14.4" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <StarButton className={className} symbol="M9.6 12H14.4" />;
}

/** Menu: three golden stars in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <CelestialSvg className={className}>
      <path d={starPath(4.4, 12.4, 3.4, 1.4)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={starPath(12, 12.4, 4, 1.7)} fill={C.goldLight} stroke={C.goldDark} strokeWidth={0.8} />
      <path d={starPath(19.6, 12.4, 3.4, 1.4)} fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
    </CelestialSvg>
  );
}

export const CELESTIAL_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
