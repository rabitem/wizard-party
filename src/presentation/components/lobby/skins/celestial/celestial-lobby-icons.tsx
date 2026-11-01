import type { ReactNode } from 'react';
import { CELESTIAL_ICONS, starPath, twinklePath } from '@/presentation/components/hud/skins/celestial/celestial-icons';
import { CELESTIAL_PALETTE as C } from '@/presentation/components/hud/skins/celestial/celestial-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/**
 * Twelve star-sign glyphs (simplified astrological marks, 24x24, stroke only). Purely decorative:
 * a seat's sign is derived from its index, not from anything about the player.
 */
export const ZODIAC_GLYPHS = [
  'M12 21V9M12 9C12 4 6 3 5 7C4 10 7 11 8 10M12 9C12 4 18 3 19 7C20 10 17 11 16 10',
  'M5 4Q12 12 19 4M17 15A5 5 0 1 1 7 15A5 5 0 1 1 17 15Z',
  'M6 4Q12 7 18 4M6 20Q12 17 18 20M9 5.5V18.5M15 5.5V18.5',
  'M19 9Q14 4 7 6M5 15Q10 20 17 18M10 8.5A2.5 2.5 0 1 1 5 8.5A2.5 2.5 0 1 1 10 8.5ZM19 15.5A2.5 2.5 0 1 1 14 15.5A2.5 2.5 0 1 1 19 15.5Z',
  'M11 14A3 3 0 1 1 5 14A3 3 0 1 1 11 14ZM10.5 12Q8 4 14 4Q19 4 16 12Q13 18 19 20',
  'M4 6V18M4 8Q7 5 9 8V18M9 8Q12 5 14 8V18M14 9Q17 6 18 10Q18 16 13 20',
  'M4 19H20M4 15H8Q8 8 12 8Q16 8 16 15H20',
  'M4 6V18M4 8Q7 5 9 8V18M9 8Q12 5 14 8V17Q14 19 17 19H20M18 17L20 19L18 21',
  'M5 19L19 5M12 5H19V12M8 10L14 16',
  'M4 6L7 16L10 6Q12 18 16 16Q20 14 17 11Q14 9 14 14Q14 20 9 21',
  'M3 10L6 7L9 10L12 7L15 10L18 7L21 10M3 16L6 13L9 16L12 13L15 16L18 13L21 16',
  'M6 4Q11 12 6 20M18 4Q13 12 18 20M6 12H18',
] as const;

/** The decorative sign of a seat (spread out so neighbours differ visibly). */
export function zodiacOf(index: number): string {
  return ZODIAC_GLYPHS[(index * 5) % ZODIAC_GLYPHS.length];
}

/** A star-sign glyph in gold with a dark rim, sized by className. */
export function ZodiacGlyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} stroke={C.outline} strokeWidth={3.4} />
      <path d={d} stroke={C.gold} strokeWidth={1.8} />
    </svg>
  );
}

function CelestialLobbySvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      {children}
    </svg>
  );
}

/** Emblem: a crescent moon cradling a five-pointed star, two twinkles. */
function CrescentIcon({ className }: { className?: string }) {
  return (
    <CelestialLobbySvg className={className}>
      <path d="M13 2.5A9.5 9.5 0 1 0 21.5 15A7.5 7.5 0 1 1 13 2.5Z" fill={C.moon} stroke={C.outline} strokeWidth={0.9} />
      <path d="M8.4 7.6A7 7 0 0 0 9 18.4" stroke={C.goldLight} strokeWidth={0.8} opacity={0.7} />
      <path d={starPath(16.4, 9.4, 3.4, 1.4)} fill={C.gold} stroke={C.outline} strokeWidth={0.7} />
      <path d={twinklePath(20.2, 3.6, 1.8)} fill={C.star} />
      <path d={twinklePath(4.2, 4.4, 1.3)} fill={C.star} opacity={0.8} />
    </CelestialLobbySvg>
  );
}

/** Empty seat: a three-star constellation with one dashed, unfinished link. */
function ConstellationIcon({ className }: { className?: string }) {
  return (
    <CelestialLobbySvg className={className}>
      <path d="M5 17L11 8L19 12" stroke={C.goldDark} strokeWidth={1.2} />
      <path d="M19 12L16 20" stroke={C.gold} strokeWidth={1.2} strokeDasharray="1.4 2" opacity={0.7} />
      <path d={twinklePath(5, 17, 2.6)} fill={C.star} stroke={C.outline} strokeWidth={0.5} />
      <path d={twinklePath(11, 8, 3)} fill={C.gold} stroke={C.outline} strokeWidth={0.5} />
      <path d={twinklePath(19, 12, 2.4)} fill={C.star} stroke={C.outline} strokeWidth={0.5} />
      <circle cx={16} cy={20} r={1.2} stroke={C.gold} strokeWidth={0.8} opacity={0.7} />
    </CelestialLobbySvg>
  );
}

/** Add bot: a comet with a layered golden tail. */
function CometIcon({ className }: { className?: string }) {
  return (
    <CelestialLobbySvg className={className}>
      <path d="M2.5 21.5L14 11L16 13Z" fill={C.gold} opacity={0.35} />
      <path d="M6 20.5L14.4 11.6L15.8 13Z" fill={C.goldLight} opacity={0.6} />
      <path d="M4 15L13 10.6M9 21L13.6 13" stroke={C.star} strokeWidth={0.8} opacity={0.6} />
      <circle cx={16.2} cy={10.2} r={4} fill={C.star} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={15.2} cy={9.2} r={1.3} fill={C.white} opacity={0.9} />
    </CelestialLobbySvg>
  );
}

/** Divider: a single twinkle. */
function TwinkleIcon({ className }: { className?: string }) {
  return (
    <CelestialLobbySvg className={className}>
      <path d={twinklePath(12, 12, 9)} fill={C.gold} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={12} cy={12} r={1.6} fill={C.goldLight} />
    </CelestialLobbySvg>
  );
}

/** Lobby glyphs: reuses the HUD's gilded trophy and astrolabe. */
export const CELESTIAL_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: CrescentIcon,
  host: CELESTIAL_ICONS.trophy,
  emptySeat: ConstellationIcon,
  addBot: CometIcon,
  start: CELESTIAL_ICONS.settings,
  divider: TwinkleIcon,
};
