import type { ReactNode } from 'react';
import type { HudIconComponent, HudIconId } from '../hud-skin.types';
import { PIXEL_PALETTE as C } from './pixel-palette';

/*
 * Pixel HUD icons, drawn on a 24x24 viewBox like lucide so they drop into the same w-4/w-5/w-6
 * slots. Each sprite is an ASCII map on a 12x12 grid (2 units per pixel) rendered as merged
 * <rect> runs with crisp edges. Full colour (they ignore the text colour), no ids.
 */

/** Sprite map key: one character per pixel, `.` is transparent. */
export const PIXEL_KEY: Record<string, string> = {
  K: C.outline,
  W: C.white,
  R: C.red,
  r: C.redDark,
  Y: C.yellow,
  y: C.yellowDark,
  G: C.green,
  g: C.greenDark,
  B: C.blue,
  b: C.blueDark,
  S: C.gray,
  s: C.grayDark,
};

/** Renders an ASCII sprite as rects, merging horizontal runs of the same colour. */
export function PixelArt({ rows, x = 0, y = 0, cell = 2 }: { rows: readonly string[]; x?: number; y?: number; cell?: number }) {
  const rects: ReactNode[] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      let end = c + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = PIXEL_KEY[ch];
      if (fill) {
        rects.push(<rect key={`${r}-${c}`} x={x + c * cell} y={y + r * cell} width={(end - c) * cell} height={cell} fill={fill} />);
      }
      c = end;
    }
  }
  return <g>{rects}</g>;
}

function PixelSvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** A full-size 12x12 sprite icon. */
function sprite(rows: readonly string[]): HudIconComponent {
  function SpriteIcon({ className }: { className?: string }) {
    return (
      <PixelSvg className={className}>
        <PixelArt rows={rows} />
      </PixelSvg>
    );
  }
  return SpriteIcon;
}

/** Shuffle: a yellow arrow heading right above a blue arrow heading left. */
const SHUFFLE = [
  '......Y.....',
  '......YY....',
  'WYYYYYYYY...',
  'yyyyyyyyy...',
  '......yy....',
  '......y.....',
  '.....B......',
  '....BB......',
  '...BBBBBBBBW',
  '...bbbbbbbbb',
  '....bb......',
  '.....b......',
];

/** Sort: pixel bricks stacked from wide to narrow. */
const SORT = [
  '............',
  '....WYYY....',
  '....YYYY....',
  '....yyyy....',
  '............',
  '..WGGGgGGG..',
  '..GGGGgGGG..',
  '..gggggggg..',
  '............',
  'WRRRRRrRRRRR',
  'RRRRRRrRRRRR',
  'rrrrrrrrrrrr',
];

/** Chat: a pixel speech bubble with three dots and a stepped tail. */
const CHAT = [
  '............',
  '.KKKKKKKKKK.',
  'KWWWWWWWWWWK',
  'KWWWWWWWWWWK',
  'KWKKWKKWKKWK',
  'KWKKWKKWKKWK',
  'KWWWWWWWWWWK',
  'KSSSSSSSSSSK',
  '.KKSSKKKKKK.',
  '..KSK.......',
  '.KK.........',
  '............',
];

/** Emotes: a round pixel smiley with a shine and a shaded edge. */
const EMOTES = [
  '...KKKKKK...',
  '.KKYYYYYYKK.',
  '.KYWWYYYYYK.',
  'KYWYYYYYYYYK',
  'KYYYKYYKYYYK',
  'KYYYKYYKYYYK',
  'KYYYYYYYYYYK',
  'KYKYYYYYYKYK',
  'KYYKKKKKKYyK',
  '.KYYYYYYYyK.',
  '.KKyyyyyyKK.',
  '...KKKKKK...',
];

/** Stats: a pixel bar chart rising left to right. */
const STATS = [
  '............',
  '.........Wg.',
  '.........Gg.',
  '.........Gg.',
  '.....Wy..Gg.',
  '.....Yy..Gg.',
  '.....Yy..Gg.',
  '.Wr..Yy..Gg.',
  '.Rr..Yy..Gg.',
  '.Rr..Yy..Gg.',
  '.Rr..Yy..Gg.',
  'SSSSSSSSSSSS',
];

/** Settings: a pixel gear with a round hole. */
const SETTINGS = [
  '.....SS.....',
  '.SS.SSSS.SS.',
  '.SWSSSSSSSS.',
  '..SSSSSSSS..',
  '.SSSS..SSSS.',
  'SSSS....SSSs',
  'SSSS....SSss',
  '.SSSS..ssss.',
  '..SSSSSSss..',
  '.SSSSSSssss.',
  '.SS.SSss.ss.',
  '.....ss.....',
];

/** Trophy: a pixel cup with handles on a grey stand. */
const TROPHY = [
  '..YYYYYYYY..',
  'YYYWYYYYYyYY',
  'Y.YWYYYYYy.Y',
  'Y.YWYYYYYy.Y',
  '.YYYYYYYYyY.',
  '...YYYYYy...',
  '....YYyy....',
  '.....Yy.....',
  '.....Yy.....',
  '....YYyy....',
  '...SSSSSS...',
  '..ssssssss..',
];

/** Bid +: a green pixel plus with an outline. */
const BID_PLUS = [
  '............',
  '....KKKK....',
  '....KWGK....',
  '....KGGK....',
  '.KKKKGGKKKK.',
  '.KWGGGGGGGK.',
  '.KggggggggK.',
  '.KKKKggKKKK.',
  '....KggK....',
  '....KggK....',
  '....KKKK....',
  '............',
];

/** Bid -: a red pixel minus with an outline. */
const BID_MINUS = [
  '............',
  '............',
  '............',
  '............',
  '.KKKKKKKKKK.',
  '.KWRRRRRRRK.',
  '.KrrrrrrrrK.',
  '.KKKKKKKKKK.',
  '............',
  '............',
  '............',
  '............',
];

/** A 5x4 pixel heart for the menu icon (drawn at 1.5 units per pixel). */
const HEART = ['RR.RR', 'RWRRr', '.RRr.', '..r..'];

/** Menu: three pixel hearts in a row. */
function MenuIcon({ className }: { className?: string }) {
  return (
    <PixelSvg className={className}>
      {[0, 8.25, 16.5].map((x) => (
        <PixelArt key={x} rows={HEART} x={x} y={9} cell={1.5} />
      ))}
    </PixelSvg>
  );
}

export const PIXEL_ICONS: Partial<Record<HudIconId, HudIconComponent>> = {
  shuffle: sprite(SHUFFLE),
  sort: sprite(SORT),
  chat: sprite(CHAT),
  emotes: sprite(EMOTES),
  stats: sprite(STATS),
  settings: sprite(SETTINGS),
  trophy: sprite(TROPHY),
  'bid-plus': sprite(BID_PLUS),
  'bid-minus': sprite(BID_MINUS),
  menu: MenuIcon,
};
