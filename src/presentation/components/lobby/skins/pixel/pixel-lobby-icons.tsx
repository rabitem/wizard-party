import { PIXEL_ICONS, PixelArt } from '@/presentation/components/hud/skins/pixel/pixel-icons';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/*
 * Pixel lobby sprites: ASCII maps in the HUD's sprite key (K outline, W white, R/r red, Y/y yellow,
 * G/g green, B/b blue, S/s grey; `.` transparent), rendered through the HUD's PixelArt.
 */

/** A little robot with antenna, visor eyes and stubby legs (10x13). */
export const ROBOT = [
  '....YY....',
  '....ss....',
  '.SSSSSSSS.',
  '.SBBSSBBS.',
  '.SBWSSBWS.',
  '.SSSSSSSS.',
  '.SSrrrrSS.',
  '..ssssss..',
  '.SSSSSSSS.',
  'SsSSGGSSsS',
  '.SSSSSSSS.',
  '..SS..SS..',
  '..ss..ss..',
] as const;

/** A gold coin with a stamped slot (8x8). */
export const COIN = [
  '..yyyy..',
  '.yYYYYy.',
  'yYWYyYYy',
  'yYWYyYYy',
  'yYYYyYYy',
  'yYYYyYYy',
  '.yYYYYy.',
  '..yyyy..',
] as const;

/** Selection cursors (5x7). */
export const ARROW_RIGHT = ['Y....', 'YY...', 'YYY..', 'YYYY.', 'YYY..', 'YY...', 'Y....'] as const;
export const ARROW_LEFT = ['....Y', '...YY', '..YYY', '.YYYY', '..YYY', '...YY', '....Y'] as const;

/** A chunky star (12x12). */
const STAR = [
  '.....YY.....',
  '.....YY.....',
  '....YYYY....',
  'YYYYYYYYYYYY',
  '.YYYYWWYYYY.',
  '..YYYWYYYY..',
  '...YYYYYY...',
  '...YYYYYY...',
  '..YYYyyYYY..',
  '..YYy..yYY..',
  '.YYy....yYY.',
  '.Yy......yY.',
] as const;

/** A green play triangle with a white rim (12x12). */
const PLAY = [
  '..W.........',
  '..WW........',
  '..WGW.......',
  '..WGGW......',
  '..WGGGW.....',
  '..WGGGGW....',
  '..WGGGGW....',
  '..WGGGW.....',
  '..WGGW......',
  '..WGW.......',
  '..WW........',
  '..W.........',
] as const;

/** A crisp sprite in its own viewBox (one unit per pixel), sized by className. */
export function PixelSprite({ rows, className }: { rows: readonly string[]; className?: string }) {
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" className={className}>
      <PixelArt rows={rows} cell={1} />
    </svg>
  );
}

/** A lucide-sized (24x24) icon from a sprite, centred. */
function spriteIcon(rows: readonly string[], cell: number): LobbyIconComponent {
  const x = (24 - rows[0].length * cell) / 2;
  const y = (24 - rows.length * cell) / 2;
  function PixelLobbyIcon({ className }: { className?: string }) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" shapeRendering="crispEdges" aria-hidden="true" focusable="false" className={className}>
        <PixelArt rows={rows} x={x} y={y} cell={cell} />
      </svg>
    );
  }
  return PixelLobbyIcon;
}

/** Lobby glyphs: reuses the HUD's pixel trophy and menu dots. */
export const PIXEL_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: spriteIcon(STAR, 2),
  host: PIXEL_ICONS.trophy,
  emptySeat: spriteIcon(COIN, 2.5),
  addBot: spriteIcon(ROBOT, 1.8),
  start: spriteIcon(PLAY, 2),
  divider: PIXEL_ICONS.menu,
};
