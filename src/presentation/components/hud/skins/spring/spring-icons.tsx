import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { SPRING_PALETTE as C } from './spring-palette';

/*
 * Spring HUD icons (cherry blossom garden), drawn on a 24x24 grid like lucide so they drop into
 * the same w-4/w-5/w-6 slots. Full colour (they ignore the text colour), no ids (many copies
 * render at once), and every shape gets a thin dark outline so it reads on any surface.
 */

function SpringSvg({ className, children }: { className?: string; children: ReactNode }) {
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

/** A notched cherry blossom petal of length `l`, base at the origin, pointing up. */
export function petalPath(l: number): string {
  return `M0 0C${r2(-0.7 * l)} ${r2(-0.25 * l)} ${r2(-0.62 * l)} ${r2(-0.92 * l)} ${r2(-0.24 * l)} ${-l}`
    + `L0 ${r2(-0.84 * l)}L${r2(0.24 * l)} ${-l}C${r2(0.62 * l)} ${r2(-0.92 * l)} ${r2(0.7 * l)} ${r2(-0.25 * l)} 0 0Z`;
}

const FIVE_PETALS = [0, 72, 144, 216, 288];

/** A five-petal cherry blossom with a yellow heart. */
export function Blossom({ cx, cy, size, color = C.blossom, rim = C.blossomDark }: {
  cx: number;
  cy: number;
  size: number;
  color?: string;
  rim?: string;
}) {
  const d = petalPath(size);
  return (
    <g>
      {FIVE_PETALS.map((angle) => (
        <path key={angle} d={d} fill={color} stroke={rim} strokeWidth={0.8} transform={`translate(${cx} ${cy}) rotate(${angle})`} />
      ))}
      <circle cx={cx} cy={cy} r={r2(Math.max(size * 0.24, 0.7))} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
    </g>
  );
}

/** One petal riding a curved gust of wind. */
function SwirlPetal({ color, rim }: { color: string; rim: string }) {
  return (
    <g>
      <path d="M4 14.5C4 7 12 3.6 17.6 6.6" stroke={C.outline} strokeWidth={2.2} />
      <path d="M4 14.5C4 7 12 3.6 17.6 6.6" stroke={C.blossomLight} strokeWidth={1.2} />
      <path d={petalPath(5.4)} fill={color} stroke={rim} strokeWidth={0.9} transform="translate(17.2 6.4) rotate(118)" />
    </g>
  );
}

/** Shuffle: two cherry blossom petals swirling around each other. */
function ShuffleIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <SwirlPetal color={C.blossom} rim={C.blossomDark} />
      <g transform="rotate(180 12 12)">
        <SwirlPetal color={C.blossomLight} rim={C.blossomDark} />
      </g>
    </SpringSvg>
  );
}

/** A terracotta flower pot: rim on top of a tapering body. */
function FlowerPot({ cx, top, width, height }: { cx: number; top: number; width: number; height: number }) {
  const half = width / 2;
  const taper = r2(width * 0.14);
  const body = `M${r2(cx - half + 0.6)} ${top + 1.8}H${r2(cx + half - 0.6)}L${r2(cx + half - 0.6 - taper)} ${top + height}`
    + `H${r2(cx - half + 0.6 + taper)}Z`;
  return (
    <g>
      <path d={body} fill={C.terracotta} stroke={C.terracottaDark} strokeWidth={0.9} />
      <rect x={r2(cx - half)} y={top} width={width} height={2} rx={0.6} fill={C.terracottaLight} stroke={C.terracottaDark} strokeWidth={0.9} />
      <path d={`M${r2(cx - half + 1.6)} ${top + 3}V${r2(top + height - 1)}`} stroke="#ffffff" strokeWidth={0.8} opacity={0.45} />
    </g>
  );
}

/** Sort: flower pots stacked from big to small, a sprout in the top one. */
function SortIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <FlowerPot cx={12} top={15} width={13} height={6} />
      <FlowerPot cx={12} top={10} width={10.5} height={5} />
      <FlowerPot cx={12} top={5.6} width={8} height={4.4} />
      <path d="M12 5.6V3" stroke={C.stem} strokeWidth={0.9} />
      <path d="M12 3.6C10.6 1.4 8.6 2 8.6 2.6C9.4 3.8 11 4.2 12 3.6Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.8} />
      <path d="M12 3.4C13.4 1.2 15.4 1.8 15.4 2.4C14.6 3.6 13 4 12 3.4Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.8} />
    </SpringSvg>
  );
}

/** Chat: a speech bubble shaped like a notched blossom petal. */
function ChatIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <path d="M6.6 15.2L4.2 20.8L10.6 17.2Z" fill={C.blossom} stroke={C.blossomDark} strokeWidth={1} />
      <path
        d="M12 4.2L13.5 5.3C17.6 3.2 21.2 6.2 20.6 10.6C20 15 15.8 17.6 12 17.6C8.2 17.6 4 15 3.4 10.6C2.8 6.2 6.4 3.2 10.5 5.3Z"
        fill={C.blossom}
        stroke={C.blossomDark}
        strokeWidth={1}
      />
      <path d="M6.2 8.2Q7.2 6.4 9.2 6.4" stroke="#ffffff" strokeWidth={0.9} opacity={0.75} />
      <g fill={C.blossomDeep}>
        <circle cx={8.4} cy={11.4} r={1.1} />
        <circle cx={12} cy={11.4} r={1.1} />
        <circle cx={15.6} cy={11.4} r={1.1} />
      </g>
    </SpringSvg>
  );
}

const SIX_PETALS = [0, 60, 120, 180, 240, 300];

/** Emotes: a smiling flower. */
function EmotesIcon({ className }: { className?: string }) {
  const petal = petalPath(10.4);
  return (
    <SpringSvg className={className}>
      {SIX_PETALS.map((angle) => (
        <path key={angle} d={petal} fill={C.blossom} stroke={C.blossomDark} strokeWidth={0.9} transform={`translate(12 12) rotate(${angle + 30})`} />
      ))}
      <circle cx={12} cy={12} r={5.4} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.9} />
      <path d="M9.4 11.2Q10.1 10.2 10.8 11.2M13.2 11.2Q13.9 10.2 14.6 11.2" stroke={C.ink} strokeWidth={0.9} />
      <path d="M9.8 13.2Q12 15.4 14.2 13.2" stroke={C.ink} strokeWidth={1} />
      <circle cx={8.9} cy={13} r={0.8} fill={C.blossomDark} opacity={0.6} />
      <circle cx={15.1} cy={13} r={0.8} fill={C.blossomDark} opacity={0.6} />
    </SpringSvg>
  );
}

/** A tulip head (three-pointed cup) whose base sits at (cx, y). */
function tulipPath(cx: number, y: number): string {
  return `M${cx - 2.6} ${y - 4.8}L${cx - 1.3} ${y - 3.4}L${cx} ${y - 5.2}L${cx + 1.3} ${y - 3.4}L${cx + 2.6} ${y - 4.8}`
    + `C${cx + 2.8} ${y - 1} ${cx + 1.6} ${y} ${cx} ${y}C${cx - 1.6} ${y} ${cx - 2.8} ${y - 1} ${cx - 2.6} ${y - 4.8}Z`;
}

/** A tulip on a stem from the ground (y 21) up to `head`, with one leaf. */
function Tulip({ cx, head, color, rim, leftLeaf }: { cx: number; head: number; color: string; rim: string; leftLeaf: boolean }) {
  const s = leftLeaf ? -1 : 1;
  return (
    <g>
      <path d={`M${cx} 21V${head}`} stroke={C.stem} strokeWidth={1.3} />
      <path
        d={`M${cx} 20.6Q${cx + s * 3.6} 19 ${cx + s * 3.2} 15.4Q${cx + s * 1} 17.2 ${cx} 18.8Z`}
        fill={C.leaf}
        stroke={C.leafDark}
        strokeWidth={0.8}
      />
      <path d={tulipPath(cx, head)} fill={color} stroke={rim} strokeWidth={0.9} />
    </g>
  );
}

/** Stats: tulips growing taller left to right like a bar chart. */
function StatsIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <Tulip cx={5} head={14.6} color={C.blossom} rim={C.blossomDark} leftLeaf={false} />
      <Tulip cx={12} head={10.4} color={C.tulipPurple} rim={C.tulipPurpleDark} leftLeaf={false} />
      <Tulip cx={19} head={6.4} color={C.tulipRed} rim={C.tulipRedDark} leftLeaf />
      <path d="M2 21.3H22" stroke={C.bark} strokeWidth={1.3} />
    </SpringSvg>
  );
}

const EIGHT_PETALS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Settings: a flower whose round petals double as gear teeth. */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      {EIGHT_PETALS.map((angle) => (
        <ellipse key={angle} cx={12} cy={5.2} rx={2.5} ry={3.1} fill={C.blossom} stroke={C.blossomDark} strokeWidth={0.9} transform={`rotate(${angle} 12 12)`} />
      ))}
      <circle cx={12} cy={12} r={5.2} fill={C.blossomLight} stroke={C.blossomDark} strokeWidth={0.9} />
      <circle cx={12} cy={12} r={2.3} fill={C.yellow} stroke={C.yellowDark} strokeWidth={0.8} />
      <path d="M8.9 10.1A3.6 3.6 0 0 1 10.6 8.7" stroke="#ffffff" strokeWidth={0.9} opacity={0.7} />
    </SpringSvg>
  );
}

/** Trophy: a watering can with a blossom on its side. */
function TrophyIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <path d="M7.4 10.6C7.4 5.2 14.6 5.2 14.6 10.6" stroke={C.canDark} strokeWidth={1.5} />
      <path d="M15.4 17.4L20.6 9.6" stroke={C.outline} strokeWidth={3} />
      <path d="M15.4 17.4L20.6 9.6" stroke={C.can} strokeWidth={1.9} />
      <ellipse cx={21} cy={9} rx={1.9} ry={1} fill={C.can} stroke={C.canDark} strokeWidth={0.8} transform="rotate(-56 21 9)" />
      <path d="M6.4 10.4H15.6L16.6 20.4Q11 21.4 5.4 20.4Z" fill={C.can} stroke={C.canDark} strokeWidth={0.9} />
      <path d="M6.2 12.6H15.8" stroke={C.canDark} strokeWidth={0.8} opacity={0.7} />
      <path d="M7.6 13.6V19" stroke="#ffffff" strokeWidth={0.8} opacity={0.55} />
      <Blossom cx={11.4} cy={16.4} size={2.6} />
      <g fill={C.water} stroke={C.canDark} strokeWidth={0.8}>
        <path d="M22.2 12.4q.6 1 0 1.5q-.6-.5 0-1.5Z" />
        <path d="M19.8 13.2q.6 1 0 1.5q-.6-.5 0-1.5Z" />
      </g>
    </SpringSvg>
  );
}

/** A cherry blossom bud held by two sepals; `symbol` is drawn on it in deep pink. */
function Bud({ className, symbol }: { className?: string; symbol: string }) {
  return (
    <SpringSvg className={className}>
      <path d="M12 22.4V18.6" stroke={C.stem} strokeWidth={1.3} />
      <path
        d="M12 3.2C16.6 3.2 18.8 7.6 18.6 11.2C18.4 15.2 15.4 18.4 12 18.4C8.6 18.4 5.6 15.2 5.4 11.2C5.2 7.6 7.4 3.2 12 3.2Z"
        fill={C.blossom}
        stroke={C.blossomDark}
        strokeWidth={1}
      />
      <path d="M12 19.4C8.4 19.8 6.4 17.2 6.6 15.2C8.4 16.2 10.4 17 12 19.4Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.8} />
      <path d="M12 19.4C15.6 19.8 17.6 17.2 17.4 15.2C15.6 16.2 13.6 17 12 19.4Z" fill={C.leaf} stroke={C.leafDark} strokeWidth={0.8} />
      <path d="M8 7.2Q9 5.4 11 5.2" stroke="#ffffff" strokeWidth={0.9} opacity={0.7} />
      <path d={symbol} stroke={C.blossomDeep} strokeWidth={2.4} />
    </SpringSvg>
  );
}

function BidPlusIcon({ className }: { className?: string }) {
  return <Bud className={className} symbol="M8.4 11.2H15.6M12 7.6V14.8" />;
}

function BidMinusIcon({ className }: { className?: string }) {
  return <Bud className={className} symbol="M8.4 11.2H15.6" />;
}

/** Menu: three little blossoms in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <SpringSvg className={className}>
      <Blossom cx={4.4} cy={12} size={3.4} />
      <Blossom cx={12} cy={12} size={3.4} color={C.blossomLight} />
      <Blossom cx={19.6} cy={12} size={3.4} />
    </SpringSvg>
  );
}

export const SPRING_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
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
