import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { HALLOWEEN_PALETTE as C } from './halloween-palette';

/*
 * Halloween HUD icons, drawn on a 24x24 grid like lucide so they drop into the same w-4/w-5/w-6
 * slots. Full colour (they ignore the text colour), no ids (many copies render at once), and
 * every shape gets a thin dark outline so it reads on light and dark surfaces alike.
 */

function HalloweenSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A ribbed pumpkin body centred on (cx, cy) with a curly stem; children are drawn on the face. */
function Pumpkin({ cx, cy, rx, ry, children }: { cx: number; cy: number; rx: number; ry: number; children?: ReactNode }) {
  const top = cy - ry;
  return (
    <g>
      <path
        d={`M${cx} ${top + 0.4}q-0.2-${ry * 0.35} ${rx * 0.25}-${ry * 0.5}`}
        stroke={C.stemDark}
        strokeWidth={Math.max(1.2, rx * 0.28)}
      />
      <path
        d={`M${cx} ${top + 0.4}q-0.2-${ry * 0.35} ${rx * 0.25}-${ry * 0.5}`}
        stroke={C.stem}
        strokeWidth={Math.max(0.8, rx * 0.16)}
      />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={C.pumpkin} stroke={C.outline} strokeWidth={0.9} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.5} ry={ry} stroke={C.pumpkinDark} strokeWidth={0.8} opacity={0.75} />
      <path d={`M${cx} ${top + 0.3}V${cy + ry - 0.3}`} stroke={C.pumpkinDark} strokeWidth={0.8} opacity={0.6} />
      <ellipse
        cx={cx - rx * 0.55}
        cy={cy - ry * 0.45}
        rx={rx * 0.18}
        ry={ry * 0.28}
        fill={C.pumpkinLight}
        opacity={0.8}
        transform={`rotate(25 ${cx - rx * 0.55} ${cy - ry * 0.45})`}
      />
      {children}
    </g>
  );
}

/** A witch's broomstick from the handle end (x1,y1) to the bristle end (x2,y2). */
function Broom({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <g>
      <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={C.woodDark} strokeWidth={2.2} />
      <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={C.wood} strokeWidth={1.2} />
      <g transform={`translate(${x2} ${y2}) rotate(${angle})`}>
        <path d="M-1 -1.6L5.4 -3.4L5.4 3.4L-1 1.6Z" fill={C.straw} stroke={C.woodDark} strokeWidth={0.8} />
        <path d="M1.2 -2.2L5.4 -2.6M1.4 0H5.4M1.2 2.2L5.4 2.6" stroke={C.woodDark} strokeWidth={0.8} opacity={0.6} />
        <path d="M-1.2 -1.9V1.9" stroke={C.purple} strokeWidth={1.2} />
      </g>
    </g>
  );
}

/** Shuffle: two crossed witch's broomsticks. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Broom x1={3} y1={3.5} x2={14} y2={14.5} />
      <Broom x1={21} y1={3.5} x2={10} y2={14.5} />
    </HalloweenSvg>
  );
}

/** Sort: three jack-o'-lanterns stacked from big to small. */
function SortIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Pumpkin cx={12} cy={18.2} rx={7.6} ry={3.6}>
        <path d="M8.6 17.6l1-1 1 1zM13.4 17.6l1-1 1 1z" fill={C.glow} />
      </Pumpkin>
      <Pumpkin cx={12} cy={12} rx={5.6} ry={2.9}>
        <path d="M9.6 11.6l.8-.8.8.8zM12.8 11.6l.8-.8.8.8z" fill={C.glow} />
      </Pumpkin>
      <Pumpkin cx={12} cy={6.6} rx={3.8} ry={2.3} />
    </HalloweenSvg>
  );
}

/** Chat: a ghost whose wavy hem doubles as a speech bubble. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <path
        d="M4.5 11a7.5 7.5 0 0 1 15 0v9.2l-2.1-1.6-2.1 1.6-2.2-1.6-2.1 1.6-2.2-1.6L6.6 20.2l-1.4 1.4L4.5 18Z"
        fill={C.ghost}
        stroke={C.outline}
        strokeWidth={1}
      />
      <path d="M16.6 6.6a6 6 0 0 1 1.4 4.4v7.4" stroke={C.ghostShade} strokeWidth={1.2} opacity={0.8} />
      <ellipse cx={9.4} cy={10.4} rx={1.2} ry={1.6} fill={C.night} />
      <ellipse cx={14.4} cy={10.4} rx={1.2} ry={1.6} fill={C.night} />
      <ellipse cx={12} cy={14.4} rx={1.3} ry={1.6} fill={C.night} />
      <circle cx={9.1} cy={9.9} r={0.35} fill="#ffffff" />
      <circle cx={14.1} cy={9.9} r={0.35} fill="#ffffff" />
    </HalloweenSvg>
  );
}

/** Emotes: a grinning carved pumpkin with glowing eyes. */
function EmotesIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Pumpkin cx={12} cy={13.4} rx={9} ry={7.6}>
        <path d="M6.8 11.6L8.8 8.6L10.6 11.6Z" fill={C.glow} stroke={C.pumpkinDark} strokeWidth={0.5} />
        <path d="M13.4 11.6L15.2 8.6L17.2 11.6Z" fill={C.glow} stroke={C.pumpkinDark} strokeWidth={0.5} />
        <path d="M5.8 13.6Q12 15.6 18.2 13.6Q16.8 19.4 12 19.6Q7.2 19.4 5.8 13.6Z" fill={C.glow} stroke={C.pumpkinDark} strokeWidth={0.5} />
        <path d="M9.2 14.6h1.8v1.6H9.2ZM13 14.6h1.8v1.6H13ZM11.1 17.8h1.8v1.8h-1.8Z" fill={C.pumpkin} />
      </Pumpkin>
    </HalloweenSvg>
  );
}

/** A wax candle with drips and a flame; `top` is where the wax ends. */
function Candle({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <path d={`M${x} 20.8V${top}h4V20.8Z`} fill={C.candle} stroke={C.candleDark} strokeWidth={0.8} />
      <path
        d={`M${x} ${top}h4v1.6a.7.7 0 0 1-1.4 0v-.6a.7.7 0 0 1-1.4 0v1.6a.6.6 0 0 1-1.2 0Z`}
        fill="#ffffff"
        opacity={0.75}
      />
      <path d={`M${x + 2} ${top}v-1`} stroke={C.night} strokeWidth={0.8} />
      <path
        d={`M${x + 2} ${top - 1.1}c-1.2-.8-1.3-2.3 0-3.7c1.3 1.4 1.2 2.9 0 3.7Z`}
        fill={C.flame}
        stroke={C.pumpkinDark}
        strokeWidth={0.5}
      />
      <path d={`M${x + 2} ${top - 1.5}c-.5-.4-.5-1 0-1.7c.5.7.5 1.3 0 1.7Z`} fill={C.flameCore} />
    </g>
  );
}

/** Stats: candle bars of rising height. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Candle x={2.4} top={15} />
      <Candle x={10} top={11} />
      <Candle x={17.6} top={7} />
      <path d="M1.6 21.2H22.4" stroke={C.ironLight} strokeWidth={1.2} />
    </HalloweenSvg>
  );
}

/** Spoke angles of the spider web wheel. */
const WEB_SPOKES = [0, 45, 90, 135, 180, 225, 270, 315];

/** A web ring polygon at radius r (sagging slightly between spokes). */
function webRing(r: number): string {
  const pts = WEB_SPOKES.map((a) => {
    const rad = (a * Math.PI) / 180;
    return `${(12 + r * Math.sin(rad)).toFixed(2)} ${(12 - r * Math.cos(rad)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
}

/** Settings: a spider web wheel with a small spider at its hub. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <circle cx={12} cy={12} r={10} fill={C.night} opacity={0.35} />
      <g stroke={C.web} strokeWidth={0.8}>
        {WEB_SPOKES.map((angle) => (
          <path key={angle} d="M12 12V2" transform={`rotate(${angle} 12 12)`} />
        ))}
        <path d={webRing(9)} />
        <path d={webRing(6)} />
        <path d={webRing(3.2)} />
      </g>
      <path d="M10.4 11l-1.4-1M10.4 13l-1.4 1M13.6 11l1.4-1M13.6 13l1.4 1" stroke={C.night} strokeWidth={0.8} />
      <circle cx={12} cy={12.6} r={1.7} fill={C.night} stroke={C.purple} strokeWidth={0.8} />
      <circle cx={12} cy={10.6} r={1} fill={C.night} />
    </HalloweenSvg>
  );
}

/** Trophy: a bubbling witch's cauldron cup. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <circle cx={9} cy={5.4} r={1.4} fill={C.brew} stroke={C.brewDark} strokeWidth={0.8} />
      <circle cx={14} cy={3.6} r={1} fill={C.brew} stroke={C.brewDark} strokeWidth={0.8} />
      <path d="M8 21.4l1-2.4M16 21.4l-1-2.4" stroke={C.iron} strokeWidth={1.6} />
      <path d="M3.6 10h16.8c0 5.6-3.8 9.6-8.4 9.6S3.6 15.6 3.6 10Z" fill={C.iron} stroke={C.outline} strokeWidth={0.9} />
      <path d="M2.2 9.6h19.6" stroke={C.ironLight} strokeWidth={2.2} />
      <path d="M4.6 10.4Q7 8.6 9 10t4 .1t4.4-.2t2 .4" fill={C.brew} stroke={C.brewDark} strokeWidth={0.8} />
      <path d="M2.4 12.6a1.6 1.6 0 0 0 1.6 1.6M21.6 12.6a1.6 1.6 0 0 1-1.6 1.6" stroke={C.ironLight} strokeWidth={1} />
      <path d="M6.6 13.4q.8 3 3 4.2" stroke={C.ironLight} strokeWidth={0.9} opacity={0.8} />
    </HalloweenSvg>
  );
}

/** Bid +: a little pumpkin button with a carved plus. */
function BidPlusIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Pumpkin cx={12} cy={13.6} rx={8.6} ry={7.2}>
        <path d="M8 13.6H16M12 9.6V17.6" stroke={C.glow} strokeWidth={2.4} />
      </Pumpkin>
    </HalloweenSvg>
  );
}

/** Bid -: a little skull button with a minus for a grin. */
function BidMinusIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <path
        d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.4 3 5.4V20h10v-3.6c1.8-1 3-2.8 3-5.4a8 8 0 0 0-8-8Z"
        fill={C.bone}
        stroke={C.boneDark}
        strokeWidth={0.9}
      />
      <path d="M10 20v-1.6M12 20v-1.6M14 20v-1.6" stroke={C.boneDark} strokeWidth={0.8} />
      <circle cx={8.8} cy={10.6} r={1.8} fill={C.night} />
      <circle cx={15.2} cy={10.6} r={1.8} fill={C.night} />
      <path d="M8.4 15.2H15.6" stroke={C.night} strokeWidth={2.2} />
      <path d="M7 6.8a5.6 5.6 0 0 1 3-2" stroke="#ffffff" strokeWidth={0.9} opacity={0.7} />
    </HalloweenSvg>
  );
}

/** Menu: three tiny pumpkins in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <HalloweenSvg className={className}>
      <Pumpkin cx={4.6} cy={13} rx={3.2} ry={2.6} />
      <Pumpkin cx={12} cy={13} rx={3.2} ry={2.6} />
      <Pumpkin cx={19.4} cy={13} rx={3.2} ry={2.6} />
    </HalloweenSvg>
  );
}

export const HALLOWEEN_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
