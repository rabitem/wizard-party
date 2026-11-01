import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { NEON_PALETTE as C } from './neon-palette';
import styles from './neon.module.css';

/*
 * Neon HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Every shape is a glass tube: a dark backing, the coloured tube and a white-hot core.
 * The soft glow is a CSS drop-shadow in currentColor, so each icon sets its glow via `color`.
 */

function NeonSvg({ className, glow, children }: { className?: string; glow: string; children: ReactNode }) {
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
      className={`${styles.iconGlow} ${className ?? ''}`}
      style={{ color: glow }}
    >
      {children}
    </svg>
  );
}

/** One neon tube along `d`: dark backing, coloured glass, white-hot core. */
function Tube({ d, color, width = 2 }: { d: string; color: string; width?: number }) {
  return (
    <g>
      <path d={d} stroke={C.outline} strokeWidth={width + 1.4} />
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke={C.core} strokeWidth={0.8} opacity={0.75} />
    </g>
  );
}

/** A point on a circle, rounded to 2 decimals so the path strings stay short. */
function polar(cx: number, cy: number, r: number, deg: number): string {
  const rad = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
}

/** An eight-tooth gear outline. */
const GEAR_PATH = (() => {
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    points.push(polar(12, 12, 7, a - 16), polar(12, 12, 9.4, a - 8), polar(12, 12, 9.4, a + 8), polar(12, 12, 7, a + 16));
  }
  return `M${points.join('L')}Z`;
})();

/** A five-pointed star outline centred on (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) points.push(polar(cx, cy, i % 2 === 0 ? outer : inner, i * 36 - 90));
  return `M${points.join('L')}Z`;
}

const CUP_STAR = starPath(12, 8.3, 2.7, 1.15);

/** Shuffle: two glowing arrows crossing over each other. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.pink}>
      <Tube d="M3 17H6.5C10.5 17 13 7 17 7H20.5M17.8 4.4L20.5 7L17.8 9.6" color={C.cyan} />
      <Tube d="M3 7H6.5C10.5 7 13 17 17 17H20.5M17.8 14.4L20.5 17L17.8 19.6" color={C.pink} />
    </NeonSvg>
  );
}

/** Sort: stacked neon bars, longest on top. */
function SortIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.purple}>
      <Tube d="M4 6H20" color={C.cyan} />
      <Tube d="M4 12H16" color={C.purple} />
      <Tube d="M4 18H11" color={C.pink} />
    </NeonSvg>
  );
}

/** Chat: a neon-tube speech bubble with three glowing dots. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.cyan}>
      <Tube d="M5.5 4H18.5A2.5 2.5 0 0 1 21 6.5V13.5A2.5 2.5 0 0 1 18.5 16H10.5L6 20V16H5.5A2.5 2.5 0 0 1 3 13.5V6.5A2.5 2.5 0 0 1 5.5 4Z" color={C.cyan} />
      <Tube d="M8 10H8.01M12 10H12.01M16 10H16.01" color={C.pink} width={2.4} />
    </NeonSvg>
  );
}

/** Emotes: a neon smiley. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.yellow}>
      <Tube d="M12 3.2A8.8 8.8 0 1 1 11.99 3.2Z" color={C.yellow} />
      <Tube d="M9 9.2V10.6M15 9.2V10.6" color={C.pink} />
      <Tube d="M8 14.2Q12 18 16 14.2" color={C.pink} />
    </NeonSvg>
  );
}

/** Stats: equalizer bars with floating peak markers. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.purple}>
      <Tube d="M5 20.5V14.5" color={C.pink} />
      <Tube d="M9.7 20.5V8.5" color={C.purple} />
      <Tube d="M14.3 20.5V11.5" color={C.purple} />
      <Tube d="M19 20.5V6" color={C.cyan} />
      <Tube d="M3.9 11.6H6.1M8.6 5.6H10.8M13.2 8.6H15.4M17.9 3H20.1" color={C.yellow} width={1.4} />
    </NeonSvg>
  );
}

/** Settings: a glowing gear tube around a ring. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.purple}>
      <Tube d={GEAR_PATH} color={C.purple} width={1.6} />
      <Tube d="M12 9.2A2.8 2.8 0 1 1 11.99 9.2Z" color={C.cyan} width={1.6} />
    </NeonSvg>
  );
}

/** Trophy: a neon cup with a star glowing inside it. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.pink}>
      <Tube d="M7 3.5H17V8.8A5 5 0 0 1 7 8.8Z" color={C.pink} width={1.8} />
      <Tube d="M7 5.2H4.4V7.2A3 3 0 0 0 7.3 10.2M17 5.2H19.6V7.2A3 3 0 0 1 16.7 10.2" color={C.pink} width={1.4} />
      <Tube d="M12 13.8V17.6M8 20.4H16" color={C.cyan} width={1.8} />
      <Tube d={CUP_STAR} color={C.yellow} width={1.2} />
    </NeonSvg>
  );
}

/** A faint ring with a bright tube symbol inside (the bid +/- buttons). */
function BidTube({ className, symbol, color }: { className?: string; symbol: string; color: string }) {
  return (
    <NeonSvg className={className} glow={color}>
      <circle cx={12} cy={12} r={9.4} stroke={C.purple} strokeWidth={1} opacity={0.55} />
      <Tube d={symbol} color={color} width={2.6} />
    </NeonSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <BidTube className={className} symbol="M12 6.5V17.5M6.5 12H17.5" color={C.cyan} />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <BidTube className={className} symbol="M6.5 12H17.5" color={C.pink} />;
}

/** Menu: three small neon rings. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <NeonSvg className={className} glow={C.cyan}>
      <Tube d="M4.6 9.8A2.2 2.2 0 1 1 4.59 9.8Z" color={C.pink} width={1.6} />
      <Tube d="M12 9.8A2.2 2.2 0 1 1 11.99 9.8Z" color={C.cyan} width={1.6} />
      <Tube d="M19.4 9.8A2.2 2.2 0 1 1 19.39 9.8Z" color={C.yellow} width={1.6} />
    </NeonSvg>
  );
}

export const NEON_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
