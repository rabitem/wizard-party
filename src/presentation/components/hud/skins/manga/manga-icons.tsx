import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { MANGA_PALETTE as C } from './manga-palette';

/*
 * Manga HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Full colour (they ignore the text colour), no ids (many copies render at once). Ink
 * shapes get a paper-white halo so they read on the dark ink surface; paper shapes get an ink rim.
 */

function MangaSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A point on an ellipse, rounded to 2 decimals so the path strings stay short. */
function polar(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${(cx + rx * Math.cos(rad)).toFixed(2)} ${(cy + ry * Math.sin(rad)).toFixed(2)}`;
}

/**
 * A jagged comic burst: `spikes` points alternating between an outer and an inner ellipse.
 * Shared with the decor (sound-effect burst on the bid picker).
 */
export function burstPath(cx: number, cy: number, outer: [number, number], inner: [number, number], spikes: number): string {
  const step = 360 / (spikes * 2);
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const [rx, ry] = i % 2 === 0 ? outer : inner;
    points.push(polar(cx, cy, rx, ry, i * step - 90));
  }
  return `M${points.join('L')}Z`;
}

const BUBBLE_PATH = burstPath(12, 10.4, [10.6, 8.6], [8.4, 6.6], 13);

/** Four-bladed throwing star with a slight pinwheel twist (a generic star, not a weapon). */
const STAR_PATH = (() => {
  const points: string[] = [];
  for (let i = 0; i < 4; i++) {
    const tip = i * 90 - 90;
    points.push(polar(12, 12, 10, 10, tip), polar(12, 12, 3.3, 3.3, tip + 58));
  }
  return `M${points.join('L')}Z`;
})();

/** A tapered brush stroke: filled body, halo rim, dry-brush streak along its length. */
function Brush({ d, color, streak }: { d: string; color: string; streak: string }) {
  return (
    <g>
      <path d={d} fill={color} stroke={C.halo} strokeWidth={1.1} />
      <path d={streak} stroke={C.paper} strokeWidth={0.8} opacity={0.45} />
    </g>
  );
}

/** Shuffle: two crossed brush strokes with speed lines. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d="M0.8 10.6H5.4M0.8 12H6.8M0.8 13.4H5.4M18.6 10.6H23.2M17.2 12H23.2M18.6 13.4H23.2" stroke={C.paper} strokeWidth={0.8} opacity={0.75} />
      <Brush
        d="M3.4 5.4C8 9 13 14 20.6 19.4C21.1 18.7 21 18.3 20.6 17.9C14 12.4 9 8 4.3 4.3C3.7 4.4 3.3 4.9 3.4 5.4Z"
        color={C.ink}
        streak="M6 6.4C10 9.6 14 13.2 18.6 17"
      />
      <Brush
        d="M3.4 18.6C8 15 13 10 20.6 4.6C21.1 5.3 21 5.7 20.6 6.1C14 11.6 9 16 4.3 19.7C3.7 19.6 3.3 19.1 3.4 18.6Z"
        color={C.red}
        streak="M6 17.6C10 14.4 14 10.8 18.6 7"
      />
    </MangaSvg>
  );
}

/** Sort: stacked manga panels, widest on top, with screentone and hatching. */
function SortIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d="M2.8 3H21.2V8.4L2.8 9.2Z" fill={C.paper} stroke={C.ink} strokeWidth={1.3} />
      <g fill={C.ink} opacity={0.55}>
        <circle cx={14.5} cy={5} r={0.55} />
        <circle cx={16.5} cy={5} r={0.55} />
        <circle cx={18.5} cy={5} r={0.55} />
        <circle cx={15.5} cy={6.7} r={0.55} />
        <circle cx={17.5} cy={6.7} r={0.55} />
        <circle cx={19.5} cy={6.6} r={0.55} />
      </g>
      <path d="M2.8 10.8L16.6 10.2V15H2.8Z" fill={C.paperShade} stroke={C.ink} strokeWidth={1.3} />
      <path d="M5 14.6L8.4 10.8M8 14.6L11.4 10.6M11 14.6L14.4 10.4" stroke={C.ink} strokeWidth={0.8} opacity={0.5} />
      <path d="M2.8 16.6H12L10.9 21H2.8Z" fill={C.red} stroke={C.ink} strokeWidth={1.3} />
      <rect x={1.8} y={2} width={20.4} height={20} rx={0.6} stroke={C.halo} strokeWidth={0.8} opacity={0.4} />
    </MangaSvg>
  );
}

/** Chat: a classic jagged comic speech bubble with an exclamation inside. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d="M7.6 15.6L4 22L12.4 17.2Z" fill={C.paper} stroke={C.ink} strokeWidth={1.1} />
      <path d={BUBBLE_PATH} fill={C.paper} stroke={C.ink} strokeWidth={1.1} />
      <path d="M12 6.4V11.4" stroke={C.red} strokeWidth={2.2} />
      <circle cx={12} cy={14} r={1.15} fill={C.red} />
    </MangaSvg>
  );
}

/** Emotes: a chibi face with spiky ink hair and a sweat drop. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <circle cx={12} cy={13} r={8.4} fill={C.skin} stroke={C.outline} strokeWidth={1} />
      <path
        d="M3.8 13C3.4 7 7.4 3.4 12 3.4S20.6 7 20.2 13L18 9.8L16.4 11.6L14.6 8.6L12.4 10.8L10.2 8.4L8.2 11.4L6.2 9.6Z"
        fill={C.ink}
        stroke={C.halo}
        strokeWidth={0.8}
      />
      <ellipse cx={9} cy={14.4} rx={1.35} ry={1.9} fill={C.ink} />
      <ellipse cx={15} cy={14.4} rx={1.35} ry={1.9} fill={C.ink} />
      <circle cx={9.45} cy={13.7} r={0.55} fill="#ffffff" />
      <circle cx={15.45} cy={13.7} r={0.55} fill="#ffffff" />
      <ellipse cx={6.6} cy={17.1} rx={1.3} ry={0.55} fill={C.blush} opacity={0.6} />
      <ellipse cx={17.4} cy={17.1} rx={1.3} ry={0.55} fill={C.blush} opacity={0.6} />
      <path d="M10.6 18.4Q11.3 17.7 12 18.4T13.4 18.4" stroke={C.ink} strokeWidth={0.9} />
      <path d="M20 4.2C20 4.2 18.1 6.9 18.1 8.2a1.9 1.9 0 0 0 3.8 0C21.9 6.9 20 4.2 20 4.2Z" fill={C.sweat} stroke={C.ink} strokeWidth={0.8} />
      <path d="M19.2 7.9a0.9 0.9 0 0 0 0.5 0.9" stroke="#ffffff" strokeWidth={0.8} />
    </MangaSvg>
  );
}

/** One brush-stroke bar: a dry-brush top edge, tapering into the baseline. */
function barPath(x: number, top: number): string {
  return `M${x} 20.4L${x + 0.3} ${top + 1}Q${x + 1.6} ${top - 0.7} ${x + 3.9} ${top + 0.4}L${x + 4.2} 20.4Q${x + 2.1} 21.2 ${x} 20.4Z`;
}

/** Stats: three brush-stroke bars rising left to right on an inked baseline. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d={barPath(3, 13)} fill={C.ink} stroke={C.halo} strokeWidth={0.9} />
      <path d={barPath(9.6, 8.6)} fill={C.ink} stroke={C.halo} strokeWidth={0.9} />
      <path d={barPath(16.2, 4)} fill={C.red} stroke={C.halo} strokeWidth={0.9} />
      <path d="M17.6 7V18M11 11.6V18" stroke={C.paper} strokeWidth={0.8} opacity={0.4} />
      <path d="M1.8 21.6Q12 20.6 22.2 21.8" stroke={C.paper} strokeWidth={1.2} />
    </MangaSvg>
  );
}

/** Settings: a spinning four-pointed star wheel with motion arcs. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d="M3.2 7.4A10 10 0 0 1 7.4 3.2M20.8 16.6A10 10 0 0 1 16.6 20.8" stroke={C.paper} strokeWidth={0.9} opacity={0.7} />
      <path d={STAR_PATH} fill={C.inkSoft} stroke={C.halo} strokeWidth={1} />
      <path d="M12 2L13.2 9.2M22 12L14.8 13.2" stroke={C.paperShade} strokeWidth={0.8} opacity={0.6} />
      <circle cx={12} cy={12} r={3.2} fill={C.red} stroke={C.ink} strokeWidth={0.8} />
      <circle cx={12} cy={12} r={1.3} fill={C.paper} stroke={C.ink} strokeWidth={0.8} />
    </MangaSvg>
  );
}

/** Trophy: an ink pot with a bamboo brush resting in it and a hanko-stamped label. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <path d="M12.6 11.2L19.8 2.4" stroke={C.ink} strokeWidth={3} />
      <path d="M12.6 11.2L19.8 2.4" stroke={C.bamboo} strokeWidth={1.8} />
      <path d="M15.6 7.1L16.8 8.1M17.9 4.3L19.1 5.3" stroke={C.bambooDark} strokeWidth={0.9} />
      <path d="M12.2 10.2L13.8 11.4" stroke={C.ink} strokeWidth={2.4} />
      <rect x={8.4} y={9.2} width={7.2} height={2.6} rx={0.7} fill={C.inkSoft} stroke={C.halo} strokeWidth={0.8} />
      <path
        d="M5.6 14Q5.6 11.8 8.2 11.8H15.8Q18.4 11.8 18.4 14V19Q18.4 21.4 15.8 21.4H8.2Q5.6 21.4 5.6 19Z"
        fill={C.ink}
        stroke={C.halo}
        strokeWidth={1}
      />
      <rect x={9} y={14.2} width={6} height={4.6} rx={0.5} fill={C.paper} />
      <circle cx={12} cy={16.5} r={1.4} stroke={C.red} strokeWidth={1} />
      <path d="M7.2 14.4Q7.2 13.2 8.4 13.2" stroke={C.paper} strokeWidth={0.8} opacity={0.6} />
    </MangaSvg>
  );
}

/** A red hanko seal impression with a worn edge; `symbol` is stamped in the middle. */
function Hanko({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <MangaSvg className={className}>
      <circle cx={12} cy={12} r={9.2} fill={C.paper} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={12} cy={12} r={8} stroke={C.red} strokeWidth={1.8} />
      <circle cx={12} cy={12} r={8} stroke={C.paper} strokeWidth={0.9} strokeDasharray="1.1 6.3" opacity={0.85} />
      <circle cx={12} cy={12} r={5.9} stroke={C.red} strokeWidth={0.8} opacity={0.7} />
      <path d={symbol} stroke={C.red} strokeWidth={2.4} />
    </MangaSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <Hanko className={className} symbol="M8.4 12H15.6M12 8.4V15.6" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <Hanko className={className} symbol="M8.4 12H15.6" />;
}

/** One ink dot with a tiny splatter droplet. */
function InkDot({ cx, color, drop }: { cx: number; color: string; drop: [number, number] }) {
  return (
    <g>
      <circle cx={cx} cy={12} r={3} fill={color} stroke={C.halo} strokeWidth={0.9} />
      <circle cx={cx + drop[0]} cy={12 + drop[1]} r={0.7} fill={color} stroke={C.halo} strokeWidth={0.8} />
      <circle cx={cx - 1} cy={10.9} r={0.6} fill={C.paper} opacity={0.5} />
    </g>
  );
}

/** Menu: three ink dots, the middle one red. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <MangaSvg className={className}>
      <InkDot cx={4.4} color={C.ink} drop={[2.4, 3.6]} />
      <InkDot cx={12} color={C.red} drop={[-2.6, -3.6]} />
      <InkDot cx={19.6} color={C.ink} drop={[2.2, -3.6]} />
    </MangaSvg>
  );
}

export const MANGA_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
