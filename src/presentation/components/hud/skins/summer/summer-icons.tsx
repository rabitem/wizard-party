import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { SUMMER_PALETTE as C } from './summer-palette';

/*
 * Summer HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Full colour (they ignore the text colour), no ids (many copies render at once), and
 * every shape gets a thin dark outline so it reads on light and dark surfaces alike.
 */

function SummerSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A bendy foam pool noodle along `d`: outline, body, foam ribs, wet highlight. */
function Noodle({ d, color, rib }: { d: string; color: string; rib: string }) {
  return (
    <g>
      <path d={d} stroke={C.outline} strokeWidth={5.6} />
      <path d={d} stroke={color} strokeWidth={4.2} />
      <path d={d} stroke={rib} strokeWidth={4.2} strokeLinecap="butt" strokeDasharray="0.7 1.9" opacity={0.45} />
      <path d={d} stroke="#ffffff" strokeWidth={0.9} opacity={0.6} transform="translate(-0.4 -0.9)" />
    </g>
  );
}

/** Shuffle: two crossed pool noodles. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <Noodle d="M4.6 17.4C10 18 14 6 19.4 6.6" color={C.turquoise} rib={C.turquoiseDark} />
      <Noodle d="M4.6 6.6C10 6 14 18 19.4 17.4" color={C.pink} rib={C.pinkDark} />
    </SummerSvg>
  );
}

/** One swim ring seen at an angle, with a highlight on its upper-left tube. */
function SwimRing({ cy, rx, ry, color }: { cy: number; rx: number; ry: number; color: string }) {
  return (
    <g>
      <ellipse cx={12} cy={cy} rx={rx} ry={ry} stroke={C.outline} strokeWidth={3.8} />
      <ellipse cx={12} cy={cy} rx={rx} ry={ry} stroke={color} strokeWidth={2.6} />
      <ellipse
        cx={12}
        cy={cy - 0.6}
        rx={rx}
        ry={ry}
        stroke="#ffffff"
        strokeWidth={0.8}
        opacity={0.7}
        pathLength={100}
        strokeDasharray="15 85"
        strokeDashoffset={-55}
      />
    </g>
  );
}

/** Sort: swim rings stacked from big to small. */
function SortIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <SwimRing cy={18} rx={8} ry={2.8} color={C.pink} />
      <SwimRing cy={12.5} rx={6.3} ry={2.4} color={C.yellow} />
      <SwimRing cy={7} rx={4.6} ry={2} color={C.turquoise} />
    </SummerSvg>
  );
}

/** Chat: a beach ball with a speech-bubble tail. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <path d="M6.2 15.4L3.8 21L9.8 18.6Z" fill={C.white} stroke={C.outline} strokeWidth={1} />
      <circle cx={12} cy={11} r={8} fill={C.white} />
      <path d="M12 3A8 8 0 0 0 12 19Q6.5 11 12 3Z" fill={C.red} />
      <path d="M12 3A8 8 0 0 1 12 19Q17.5 11 12 3Z" fill={C.water} />
      <path d="M12 3Q9.3 11 12 19Q14.7 11 12 3Z" fill={C.yellow} />
      <circle cx={12} cy={11} r={8} stroke={C.outline} strokeWidth={1} />
      <ellipse cx={8.4} cy={6.9} rx={1.6} ry={0.9} fill="#ffffff" opacity={0.75} transform="rotate(-35 8.4 6.9)" />
    </SummerSvg>
  );
}

/** Emotes: a smiley wearing sunglasses. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <circle cx={12} cy={12} r={9} fill={C.yellow} stroke={C.outline} strokeWidth={1} />
      <path d="M4.4 10.2H19.6" stroke={C.navy} strokeWidth={1.1} />
      <rect x={5.2} y={9.2} width={5.8} height={4.3} rx={1.9} fill={C.lens} stroke={C.navy} strokeWidth={0.6} />
      <rect x={13} y={9.2} width={5.8} height={4.3} rx={1.9} fill={C.lens} stroke={C.navy} strokeWidth={0.6} />
      <path d="M6.6 11.9L8.1 10.4M14.4 11.9L15.9 10.4" stroke="#ffffff" strokeWidth={0.8} opacity={0.8} />
      <path d="M8.6 15.6Q12 18.6 15.4 15.6" stroke={C.navy} strokeWidth={1.4} />
    </SummerSvg>
  );
}

/** Sandcastle tower outline with two merlons on top. */
function towerPath(x: number, top: number, width: number, bottom = 20.5): string {
  const merlon = 1.4;
  return `M${x} ${bottom}V${top - merlon}h${merlon}V${top}h${width - 2 * merlon}V${top - merlon}h${merlon}V${bottom}Z`;
}

/** Wavy water line along the bottom of the sandcastle icons. */
const WATER_LINE = 'M1.5 21.6q1.5-1 3 0t3 0t3 0t3 0t3 0t3 0t3 0';

/** Stats: a sandcastle bar chart, towers rising left to right. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <path d={towerPath(3, 14, 5)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d={towerPath(9.5, 10, 5)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d={towerPath(16, 6, 5)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d="M11 20.5v-2.2a1 1 0 0 1 2 0v2.2Z" fill={C.sandDark} />
      <g fill={C.sandDark} opacity={0.6}>
        <circle cx={5} cy={17} r={0.4} />
        <circle cx={18.5} cy={10} r={0.4} />
        <circle cx={17.6} cy={15.5} r={0.4} />
        <circle cx={11.4} cy={13.4} r={0.4} />
      </g>
      <path d={WATER_LINE} stroke={C.turquoise} strokeWidth={1.2} />
    </SummerSvg>
  );
}

/** Settings: a sun whose rays double as gear teeth. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <g stroke={C.orange} strokeWidth={2.4}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path key={angle} d="M12 2.4V4.9" transform={`rotate(${angle} 12 12)`} />
        ))}
      </g>
      <circle cx={12} cy={12} r={6} fill={C.yellow} stroke={C.orangeDark} strokeWidth={0.9} />
      <circle cx={12} cy={12} r={2.2} fill={C.orange} stroke={C.orangeDark} strokeWidth={0.6} />
      <path d="M9 9.6A3.6 3.6 0 0 1 11 8.3" stroke="#ffffff" strokeWidth={0.9} opacity={0.7} />
    </SummerSvg>
  );
}

/** Trophy: a sandcastle with a flag on its keep. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <path d="M12 6.5V1.5" stroke={C.sandDark} strokeWidth={0.9} />
      <path d="M12 1.5L15.6 2.6L12 3.7Z" fill={C.pink} stroke={C.pinkDark} strokeWidth={0.5} />
      <path d={towerPath(3.5, 11, 5)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d={towerPath(15.5, 11, 5)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d={towerPath(8, 6.5, 8)} fill={C.sand} stroke={C.sandDark} strokeWidth={0.9} />
      <path d="M10.6 20.5v-3a1.4 1.4 0 0 1 2.8 0v3Z" fill={C.sandDark} />
      <path d="M6 13.4v1.8M18 13.4v1.8M12 9.4v1.6" stroke={C.sandDark} strokeWidth={1} />
      <path d={WATER_LINE} stroke={C.turquoise} strokeWidth={1.2} />
    </SummerSvg>
  );
}

/** A red/white buoy with its mooring loop; `symbol` is drawn on top in navy. */
function Buoy({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <SummerSvg className={className}>
      <circle cx={12} cy={3.4} r={1.4} stroke={C.navy} strokeWidth={0.9} />
      <circle cx={12} cy={13} r={8} fill={C.white} />
      <path d="M4 13A8 8 0 0 1 20 13Z" fill={C.red} />
      <circle cx={12} cy={13} r={8} stroke={C.outline} strokeWidth={1} />
      <path d={symbol} stroke={C.navy} strokeWidth={2.6} />
    </SummerSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <Buoy className={className} symbol="M7.2 13H16.8M12 8.2V17.8" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <Buoy className={className} symbol="M7.2 13H16.8" />;
}

/** One small two-tone beach ball for the menu icon. */
function MiniBall({ cx, top, bottom }: { cx: number; top: string; bottom: string }) {
  return (
    <g>
      <circle cx={cx} cy={12} r={2.9} fill={bottom} stroke={C.outline} strokeWidth={0.8} />
      <path d={`M${cx - 2.9} 12A2.9 2.9 0 0 1 ${cx + 2.9} 12Z`} fill={top} />
      <circle cx={cx} cy={12} r={2.9} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={cx - 1} cy={10.9} r={0.6} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

/** Menu: three little beach balls in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <SummerSvg className={className}>
      <MiniBall cx={4.6} top={C.pink} bottom={C.white} />
      <MiniBall cx={12} top={C.yellow} bottom={C.white} />
      <MiniBall cx={19.4} top={C.turquoise} bottom={C.white} />
    </SummerSvg>
  );
}

export const SUMMER_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
