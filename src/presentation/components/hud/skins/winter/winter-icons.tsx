import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { WINTER_PALETTE as C } from './winter-palette';

/*
 * Winter HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Full colour (they ignore the text colour), no ids (many copies render at once), and
 * every shape gets a thin dark outline so it reads on light and dark surfaces alike.
 */

function WinterSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** The six arm angles of a snowflake. */
const ARMS = [0, 60, 120, 180, 240, 300];

/** A six-armed snowflake of radius r at (cx, cy), each arm with a pair of side branches. */
function Snowflake({ cx, cy, r, color, shade, width = 1.2 }: {
  cx: number; cy: number; r: number; color: string; shade: string; width?: number;
}) {
  const arm = `M${cx} ${cy}V${cy - r}M${cx} ${cy - r * 0.55}l${-r * 0.28} ${-r * 0.28}M${cx} ${cy - r * 0.55}l${r * 0.28} ${-r * 0.28}`;
  return (
    <g>
      <g stroke={shade} strokeWidth={width + 1}>
        {ARMS.map((angle) => <path key={angle} d={arm} transform={`rotate(${angle} ${cx} ${cy})`} />)}
      </g>
      <g stroke={color} strokeWidth={width}>
        {ARMS.map((angle) => <path key={angle} d={arm} transform={`rotate(${angle} ${cx} ${cy})`} />)}
      </g>
    </g>
  );
}

/** Shuffle: two snowflakes swirling around each other on a gust of wind. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <path d="M3 10.4Q4.4 3.4 11.6 3.2" stroke={C.iceDark} strokeWidth={1} strokeDasharray="1.6 1.6" />
      <path d="M21 13.6Q19.6 20.6 12.4 20.8" stroke={C.iceDark} strokeWidth={1} strokeDasharray="1.6 1.6" />
      <Snowflake cx={15.8} cy={8.2} r={5} color={C.snow} shade={C.blue} />
      <Snowflake cx={8.2} cy={15.8} r={5} color={C.ice} shade={C.blueDark} />
    </WinterSvg>
  );
}

/** One snowball with a blue shadow on its lower right and a bright glint. */
function Snowball({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.snow} stroke={C.outline} strokeWidth={0.9} />
      <path
        d={`M${cx + r * 0.76} ${cy - r * 0.16}A${r * 0.78} ${r * 0.78} 0 0 1 ${cx - r * 0.39} ${cy + r * 0.68}`}
        stroke={C.snowShade}
        strokeWidth={r * 0.36}
      />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.4} r={r * 0.2} fill={C.frost} />
      <circle cx={cx + r * 0.2} cy={cy + r * 0.1} r={0.4} fill={C.ice} />
    </g>
  );
}

/** Sort: a little pyramid of stacked snowballs. */
function SortIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <Snowball cx={7} cy={16.6} r={4.6} />
      <Snowball cx={17} cy={16.6} r={4.6} />
      <Snowball cx={12} cy={8.4} r={4.4} />
    </WinterSvg>
  );
}

/** Chat: a frosted speech bubble with a cap of snow and an icicle. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <path d="M7 17.4L4.6 21.4L11 17.6Z" fill={C.ice} stroke={C.outline} strokeWidth={0.9} />
      <rect x={2.6} y={6.2} width={18.8} height={11.6} rx={3.6} fill={C.ice} stroke={C.outline} strokeWidth={0.9} />
      <path d="M5 9.6l1.4 1.4M5 11l1.4-1.4M17.4 13.4l1.2 1.2M17.4 14.6l1.2-1.2" stroke={C.snow} strokeWidth={0.8} opacity={0.9} />
      <path d="M8.4 12.2H15.6M8.4 14.6H13.4" stroke={C.iceDark} strokeWidth={1.1} />
      <path
        d="M2.4 9.4Q2.2 5.4 5.6 4.8Q7 2.8 9.6 3.6Q12 2.2 14.4 3.6Q17 2.8 18.6 4.8Q21.8 5.4 21.6 9.4Q20.6 8.4 19.6 9.4Q18.8 10.4 17.8 9.2Q15 8.2 12 9Q9 8.2 6.4 9.2Q5.4 10.4 4.4 9.4Q3.4 8.4 2.4 9.4Z"
        fill={C.snow}
        stroke={C.outline}
        strokeWidth={0.8}
      />
      <path d="M19.6 9.4L20.2 12.2L20.8 9.2" fill={C.frost} stroke={C.iceDark} strokeWidth={0.8} />
    </WinterSvg>
  );
}

/** Emotes: a snowman face with a top hat, coal eyes and smile and a carrot nose. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <circle cx={12} cy={14} r={8.2} fill={C.snow} stroke={C.outline} strokeWidth={1} />
      <path d="M17.6 10.6A7 7 0 0 1 13.6 21" stroke={C.snowShade} strokeWidth={1.6} />
      <rect x={8.2} y={1.4} width={7.6} height={5.6} rx={0.6} fill={C.coal} />
      <path d="M8.2 5.4H15.8" stroke={C.red} strokeWidth={1.2} />
      <path d="M5.6 7.2H18.4" stroke={C.coal} strokeWidth={1.8} />
      <circle cx={9.2} cy={11.6} r={1} fill={C.coal} />
      <circle cx={14.8} cy={11.6} r={1} fill={C.coal} />
      <path d="M12 13.2L17.4 14.4L12 15.4Z" fill={C.carrot} stroke={C.carrotDark} strokeWidth={0.6} />
      <g fill={C.coal}>
        <circle cx={8.4} cy={16.8} r={0.6} />
        <circle cx={10} cy={18} r={0.6} />
        <circle cx={12} cy={18.5} r={0.6} />
        <circle cx={14} cy={18} r={0.6} />
        <circle cx={15.6} cy={16.8} r={0.6} />
      </g>
    </WinterSvg>
  );
}

/** One icicle hanging from the eave at x, ending at `tip`. */
function Icicle({ x, tip }: { x: number; tip: number }) {
  return (
    <g>
      <path d={`M${x - 2.4} 5.4Q${x - 1.4} ${tip * 0.7} ${x} ${tip}Q${x + 1.4} ${tip * 0.7} ${x + 2.4} 5.4Z`} fill={C.ice} stroke={C.iceDark} strokeWidth={0.8} />
      <path d={`M${x - 1} 6.6Q${x - 0.6} ${tip * 0.6} ${x - 0.2} ${tip - 2}`} stroke={C.snow} strokeWidth={0.8} opacity={0.85} />
    </g>
  );
}

/** Stats: icicles of growing length hanging from a snowy eave. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <Icicle x={5} tip={12} />
      <Icicle x={12} tip={16.4} />
      <Icicle x={19} tip={21.4} />
      <path d="M1.6 5.4H22.4" stroke={C.woodDark} strokeWidth={1.4} />
      <path d="M1.6 5Q3 2.2 6 3Q8.4 1.6 11 2.8Q13.6 1.6 16 2.8Q19 1.8 20.6 3.2Q22.6 3.4 22.4 5Z" fill={C.snow} stroke={C.outline} strokeWidth={0.8} />
    </WinterSvg>
  );
}

/** Settings: a snowflake inside a frosty wheel with six notches. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <circle cx={12} cy={12} r={9.2} fill={C.blueDark} opacity={0.35} />
      <circle cx={12} cy={12} r={9.2} stroke={C.ice} strokeWidth={1.6} />
      <g stroke={C.ice} strokeWidth={2.2}>
        {ARMS.map((angle) => <path key={angle} d="M12 1.6V3.2" transform={`rotate(${angle + 30} 12 12)`} />)}
      </g>
      <Snowflake cx={12} cy={12} r={6.6} color={C.snow} shade={C.blue} width={1} />
      <circle cx={12} cy={12} r={1.3} fill={C.snow} stroke={C.blue} strokeWidth={0.8} />
    </WinterSvg>
  );
}

/** Trophy: a snow globe with a little fir tree on a wooden base. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <circle cx={12} cy={10.2} r={8.2} fill={C.glass} stroke={C.outline} strokeWidth={0.9} />
      <path d="M5 13.6Q12 11.4 19 13.6A8.2 8.2 0 0 1 5 13.6Z" fill={C.snow} />
      <path d="M12 4.6L15.4 11.4H8.6Z" fill={C.fir} stroke={C.firDark} strokeWidth={0.8} />
      <path d="M12 7L14.4 10H9.6Z" fill={C.firDark} opacity={0.5} />
      <path d="M12 11.4V12.8" stroke={C.woodDark} strokeWidth={1.2} />
      <g fill={C.snow}>
        <circle cx={7.6} cy={7.4} r={0.6} />
        <circle cx={16.4} cy={6.6} r={0.6} />
        <circle cx={9.4} cy={4.4} r={0.5} />
        <circle cx={16.8} cy={10.2} r={0.5} />
        <circle cx={6.6} cy={10.6} r={0.5} />
      </g>
      <path d="M6.6 6A6.6 6.6 0 0 1 9.6 3.4" stroke="#ffffff" strokeWidth={1} opacity={0.85} />
      <path d="M6.4 17.4H17.6L19 21.4H5Z" fill={C.wood} stroke={C.woodDark} strokeWidth={0.9} />
      <path d="M5.8 19.4H18.2" stroke={C.gold} strokeWidth={0.9} />
    </WinterSvg>
  );
}

/** A glass bauble ornament with a cap and hook; `symbol` is drawn on top in white. */
function Ornament({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <WinterSvg className={className}>
      <path d="M12 3.6V1.6" stroke={C.silverDark} strokeWidth={0.9} />
      <circle cx={12} cy={13.6} r={8} fill={C.red} stroke={C.outline} strokeWidth={1} />
      <path d="M4.6 11Q12 13.4 19.4 11" stroke={C.gold} strokeWidth={0.9} opacity={0.8} />
      <path d="M10 3.6h4v2.6h-4Z" fill={C.gold} stroke={C.goldDark} strokeWidth={0.8} />
      <path d="M7.4 10.4A5.4 5.4 0 0 1 10 7.8" stroke="#ffffff" strokeWidth={1} opacity={0.7} />
      <path d={symbol} stroke={C.snow} strokeWidth={2.4} />
    </WinterSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <Ornament className={className} symbol="M8.4 14.4H15.6M12 10.8V18" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <Ornament className={className} symbol="M8.4 14.4H15.6" />;
}

/** One small bauble for the menu icon. */
function MiniOrnament({ cx, fill, cap }: { cx: number; fill: string; cap: string }) {
  return (
    <g>
      <path d={`M${cx - 1} 8.2h2v1.4h-2Z`} fill={cap} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={cx} cy={12.6} r={3} fill={fill} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={cx - 1} cy={11.6} r={0.7} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

/** Menu: three baubles in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <WinterSvg className={className}>
      <MiniOrnament cx={4.6} fill={C.red} cap={C.gold} />
      <MiniOrnament cx={12} fill={C.gold} cap={C.silver} />
      <MiniOrnament cx={19.4} fill={C.blue} cap={C.gold} />
    </WinterSvg>
  );
}

export const WINTER_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
