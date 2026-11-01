import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { AUTUMN_PALETTE as C } from './autumn-palette';

/*
 * Autumn HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Full colour (they ignore the text colour), no ids (many copies render at once), and
 * every shape gets a thin dark outline so it reads on light and dark surfaces alike.
 */

function AutumnSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A five-lobed maple leaf on a 20x20 grid centred on (10, 10), stem pointing down. */
const MAPLE_LEAF =
  'M10 1L11.6 4.6L13.6 3.6L13 8L16.4 5.6L17 7.4L19.4 7L18 10L19.4 11L15 13.6L15.6 15.4L10.8 14.6' +
  'L11 19H9L9.2 14.6L4.4 15.4L5 13.6L.6 11L2 10L.6 7L3 7.4L3.6 5.6L7 8L6.4 3.6L8.4 4.6Z';

/** A maple leaf placed at (x, y), rotated and scaled; strokes are compensated for the scale. */
function MapleLeaf({ x, y, rotate, scale, fill, vein }: {
  x: number; y: number; rotate: number; scale: number; fill: string; vein: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale}) translate(-10 -10)`}>
      <path d={MAPLE_LEAF} fill={fill} stroke={C.outline} strokeWidth={0.9 / scale} />
      <path d="M10 17V4M10 12.6L4.6 9M10 12.6L15.4 9" stroke={vein} strokeWidth={0.8 / scale} opacity={0.8} />
    </g>
  );
}

/** Shuffle: two maple leaves swirling around each other on a gust of wind. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <path d="M3 10.4Q4.4 3.4 12 3.2" stroke={C.wheatDark} strokeWidth={1} strokeDasharray="1.6 1.6" />
      <path d="M21 13.6Q19.6 20.6 12 20.8" stroke={C.wheatDark} strokeWidth={1} strokeDasharray="1.6 1.6" />
      <MapleLeaf x={15.6} y={8.4} rotate={30} scale={0.5} fill={C.red} vein={C.redDark} />
      <MapleLeaf x={8.4} y={15.6} rotate={-150} scale={0.5} fill={C.orange} vein={C.orangeDark} />
    </AutumnSvg>
  );
}

/** One acorn centred on (cx, cy): scaly cap, glossy nut and a little stem. */
function Acorn({ cx, cy, s, children }: { cx: number; cy: number; s: number; children?: ReactNode }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`}>
      <path d="M-3.6 0Q-3.6 5 0 6.6Q3.6 5 3.6 0Z" fill={C.acorn} stroke={C.acornDark} strokeWidth={0.9 / s} />
      <path d="M-2.2 1.4Q-2 3.8 -.4 5" stroke={C.acornLight} strokeWidth={0.9 / s} opacity={0.8} />
      {children}
      <path d="M0 -3.6Q.4 -5.2 1.8 -5.6" stroke={C.capDark} strokeWidth={1.1 / s} />
      <path d="M-4.4 .6Q-4.6 -3.6 0 -3.8Q4.6 -3.6 4.4 .6Z" fill={C.cap} stroke={C.capDark} strokeWidth={0.9 / s} />
      <path d="M-3.4 -1.6L-1.4 .2M-1 -3L2 .2M1.6 -3.2L3.8 -1M-3.6 -.4L-1 -3.4M.2 .2L3.2 -3" stroke={C.capDark} strokeWidth={0.8 / s} opacity={0.6} />
    </g>
  );
}

/** Sort: a little pyramid of stacked acorns. */
function SortIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <Acorn cx={7} cy={15.4} s={1.05} />
      <Acorn cx={17} cy={15.4} s={1.05} />
      <Acorn cx={12} cy={7.6} s={0.95} />
    </AutumnSvg>
  );
}

/** Chat: a leaf whose stem is the speech-bubble tail. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <path d="M5.4 17.6L2.4 21.4" stroke={C.woodDark} strokeWidth={1.4} />
      <path d="M5 18C3 10 10 3.6 20.8 3.2C20.6 13 14 19.6 5 18Z" fill={C.orange} stroke={C.outline} strokeWidth={1} />
      <path d="M5.6 17.4Q12 11.4 20 4" stroke={C.orangeDark} strokeWidth={0.9} />
      <path d="M9.4 13.4L8.6 9.2M12.6 10.6L12.2 6.8M15.6 7.8L15.6 5.4M10.4 12.4L14.6 13.2M13.6 9.6L17.6 10" stroke={C.orangeDark} strokeWidth={0.8} opacity={0.75} />
      <path d="M7 11.6Q8.4 7.2 13 5.4" stroke={C.gold} strokeWidth={0.9} opacity={0.7} />
    </AutumnSvg>
  );
}

/** Emotes: a smiling acorn. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <Acorn cx={12} cy={10.7} s={1.8}>
        <circle cx={-1.5} cy={1.6} r={0.45} fill={C.capDark} />
        <circle cx={1.5} cy={1.6} r={0.45} fill={C.capDark} />
        <path d="M-1.6 3.1Q0 4.6 1.6 3.1" stroke={C.capDark} strokeWidth={0.45} />
        <circle cx={-2.3} cy={2.8} r={0.5} fill={C.red} opacity={0.45} />
        <circle cx={2.3} cy={2.8} r={0.5} fill={C.red} opacity={0.45} />
      </Acorn>
    </AutumnSvg>
  );
}

/** One wheat stalk standing at x with its ear starting at `top`. */
function WheatStalk({ x, top }: { x: number; top: number }) {
  const kernels = [0, 2, 4];
  return (
    <g>
      <path d={`M${x} 21V${top + 5}`} stroke={C.wheatDark} strokeWidth={1.6} />
      <path d={`M${x} 21V${top + 5}`} stroke={C.wheat} strokeWidth={0.8} />
      <path d={`M${x} ${top + 0.4}V${top - 2}`} stroke={C.wheatDark} strokeWidth={0.8} />
      {kernels.map((dy) => (
        <g key={dy} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.6}>
          <ellipse cx={x - 1.1} cy={top + dy + 1.4} rx={0.9} ry={1.5} transform={`rotate(-28 ${x - 1.1} ${top + dy + 1.4})`} />
          <ellipse cx={x + 1.1} cy={top + dy + 1.4} rx={0.9} ry={1.5} transform={`rotate(28 ${x + 1.1} ${top + dy + 1.4})`} />
        </g>
      ))}
      <ellipse cx={x} cy={top + 0.6} rx={0.8} ry={1.4} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.6} />
    </g>
  );
}

/** Stats: wheat sheaves of rising height, bound with twine. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <WheatStalk x={5} top={12.6} />
      <WheatStalk x={12} top={8.6} />
      <WheatStalk x={19} top={4.6} />
      <path d="M2.2 18.4H21.8" stroke={C.red} strokeWidth={1.2} />
      <path d="M1.6 21.4H22.4" stroke={C.woodDark} strokeWidth={1.2} />
    </AutumnSvg>
  );
}

/** Settings: a wooden cartwheel with an iron tyre and eight spokes. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <g stroke={C.woodDark} strokeWidth={2}>
        {[0, 45, 90, 135].map((angle) => (
          <path key={angle} d="M12 4V20" transform={`rotate(${angle} 12 12)`} />
        ))}
      </g>
      <g stroke={C.woodLight} strokeWidth={0.9}>
        {[0, 45, 90, 135].map((angle) => (
          <path key={angle} d="M12 4.6V19.4" transform={`rotate(${angle} 12 12)`} />
        ))}
      </g>
      <circle cx={12} cy={12} r={8.4} stroke={C.wood} strokeWidth={2.4} />
      <circle cx={12} cy={12} r={9.8} stroke={C.iron} strokeWidth={1} />
      <circle cx={12} cy={12} r={7.1} stroke={C.woodDark} strokeWidth={0.8} />
      <circle cx={12} cy={12} r={2.6} fill={C.wood} stroke={C.woodDark} strokeWidth={0.9} />
      <circle cx={12} cy={12} r={0.9} fill={C.iron} />
    </AutumnSvg>
  );
}

/** Trophy: a woven harvest basket brimming with an apple, a mini pumpkin and wheat. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <path d="M4.6 11.6Q12 -1.4 19.4 11.6" stroke={C.woodDark} strokeWidth={1.8} />
      <path d="M4.6 11.6Q12 -1.4 19.4 11.6" stroke={C.woodLight} strokeWidth={0.8} />
      <path d="M14.6 9.6L15.6 3.8M15.6 9.6L18 4.6" stroke={C.wheatDark} strokeWidth={0.9} />
      <ellipse cx={15.8} cy={4} rx={0.8} ry={1.4} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.6} />
      <ellipse cx={18.2} cy={4.8} rx={0.8} ry={1.4} fill={C.wheat} stroke={C.wheatDark} strokeWidth={0.6} transform="rotate(25 18.2 4.8)" />
      <circle cx={8.6} cy={9.8} r={2.8} fill={C.apple} stroke={C.redDark} strokeWidth={0.8} />
      <path d="M8.6 7.2Q8.8 6 9.8 5.6" stroke={C.capDark} strokeWidth={0.8} />
      <ellipse cx={13.2} cy={10.4} rx={2.8} ry={2.2} fill={C.orange} stroke={C.orangeDark} strokeWidth={0.8} />
      <path d="M13.2 8.4V12.4" stroke={C.orangeDark} strokeWidth={0.8} opacity={0.7} />
      <path d="M3 11.4H21L19 20.6H5Z" fill={C.wood} stroke={C.outline} strokeWidth={0.9} />
      <path d="M3.6 14.4H20.4M4.2 17.4H19.8" stroke={C.woodDark} strokeWidth={0.8} />
      <path d="M7.4 11.6L7.8 20.4M12 11.6V20.4M16.6 11.6L16.2 20.4" stroke={C.woodLight} strokeWidth={0.8} opacity={0.8} />
      <path d="M2.6 11.4H21.4" stroke={C.woodDark} strokeWidth={1.6} />
    </AutumnSvg>
  );
}

/** A big acorn cap button; `symbol` is carved into it in cream. */
function AcornCap({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <AutumnSvg className={className}>
      <path d="M12 6Q12.6 3 15 2.2" stroke={C.capDark} strokeWidth={1.8} />
      <path d="M2.6 16.4Q2 6.2 12 5.8Q22 6.2 21.4 16.4Q12 19.6 2.6 16.4Z" fill={C.cap} stroke={C.capDark} strokeWidth={1} />
      <path d="M4.4 11.4L7 14M6 8.4L10.6 13M10.4 6.6L15.6 11.8M15.2 7L19.6 11.4M4.6 13.6L11 7.2M9.4 15.6L17.8 7.6M15 16.4L20 11.6" stroke={C.capDark} strokeWidth={0.8} opacity={0.55} />
      <path d="M2.6 16.4Q12 19.6 21.4 16.4" stroke={C.acornDark} strokeWidth={1.4} />
      <path d={symbol} stroke={C.cream} strokeWidth={2.4} />
    </AutumnSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <AcornCap className={className} symbol="M8.2 12H15.8M12 8.2V15.8" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <AcornCap className={className} symbol="M8.2 12H15.8" />;
}

/** One small pointed leaf with a midrib, tilted by `rotate`. */
function MiniLeaf({ cx, rotate, fill, vein }: { cx: number; rotate: number; fill: string; vein: string }) {
  return (
    <g transform={`rotate(${rotate} ${cx} 12)`}>
      <path d={`M${cx} 7.6Q${cx + 3.4} 11 ${cx} 16.4Q${cx - 3.4} 11 ${cx} 7.6Z`} fill={fill} stroke={C.outline} strokeWidth={0.8} />
      <path d={`M${cx} 8.6V15.4`} stroke={vein} strokeWidth={0.8} opacity={0.8} />
    </g>
  );
}

/** Menu: three leaves in a row (red, orange, gold). */
function MenuIcon({ className }: { className?: string }) {
  return (
    <AutumnSvg className={className}>
      <MiniLeaf cx={4.6} rotate={-20} fill={C.red} vein={C.redDark} />
      <MiniLeaf cx={12} rotate={10} fill={C.orange} vein={C.orangeDark} />
      <MiniLeaf cx={19.4} rotate={-12} fill={C.gold} vein={C.goldDark} />
    </AutumnSvg>
  );
}

export const AUTUMN_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
