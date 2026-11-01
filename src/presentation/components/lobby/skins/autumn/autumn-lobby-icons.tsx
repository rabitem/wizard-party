import { AUTUMN_ICONS } from '@/presentation/components/hud/skins/autumn/autumn-icons';
import { AUTUMN_PALETTE as C } from '@/presentation/components/hud/skins/autumn/autumn-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/** Empty seat: a round hay bale with a tiny pumpkin on top (24x24 grid like lucide). */
function HayBaleIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <rect x={3} y={10} width={18} height={11} rx={3} fill={C.wheat} stroke={C.outline} strokeWidth={0.8} />
      <path d="M3.5 14H20.5M3.5 17.5H20.5" stroke={C.wheatDark} strokeWidth={0.8} />
      <path d="M8 10V21M16 10V21" stroke={C.woodDark} strokeWidth={1.1} />
      <ellipse cx={12} cy={8} rx={4} ry={3.2} fill={C.orange} stroke={C.orangeDark} strokeWidth={0.8} />
      <path d="M12 5V11M9.5 5.6Q8.6 8 9.5 10.4M14.5 5.6Q15.4 8 14.5 10.4" stroke={C.orangeDark} strokeWidth={0.6} />
      <path d="M12 5Q12.4 3.4 13.8 3" stroke={C.leafGreen} strokeWidth={1.2} />
    </svg>
  );
}

/** Start: a shiny red apple with a leaf. */
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M12 7.5Q9 5.6 6.4 7.4Q3.6 9.6 4.6 14Q5.8 19.4 9.2 20.6Q10.8 21 12 20.2Q13.2 21 14.8 20.6Q18.2 19.4 19.4 14Q20.4 9.6 17.6 7.4Q15 5.6 12 7.5Z"
        fill={C.apple}
        stroke={C.redDark}
        strokeWidth={0.9}
      />
      <path d="M12 7.5Q11.8 5 13 3" stroke={C.bark} strokeWidth={1.3} />
      <path d="M13 4.6Q16 2.4 18 4.2Q15.6 6.6 13 4.6Z" fill={C.leafGreen} stroke={C.outline} strokeWidth={0.6} />
      <ellipse cx={8.4} cy={11} rx={1.3} ry={2.2} fill="#ffffff" opacity={0.45} transform="rotate(20 8.4 11)" />
    </svg>
  );
}

/** Lobby glyphs: the HUD's smiling acorn, harvest basket and cartwheel plus two harvest props. */
export const AUTUMN_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: AUTUMN_ICONS.emotes,
  host: AUTUMN_ICONS.trophy,
  emptySeat: HayBaleIcon,
  start: AppleIcon,
  divider: AUTUMN_ICONS.settings,
};
