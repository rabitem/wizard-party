import { SUMMER_ICONS } from '@/presentation/components/hud/skins/summer/summer-icons';
import { SUMMER_PALETTE as C } from '@/presentation/components/hud/skins/summer/summer-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/** Empty seat: a free sun lounger with a rolled towel (24x24 grid like lucide). */
function SunbedIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M4 19L6 15M18 19L17 15M10 19L11 15" stroke={C.sandDark} strokeWidth={1.6} />
      <path d="M3 15H17L21 7" stroke={C.outline} strokeWidth={3.6} />
      <path d="M3 15H17L21 7" stroke={C.turquoise} strokeWidth={2.4} />
      <path d="M5 15H9M12 15H15M18.4 12.2L19.6 9.8" stroke={C.white} strokeWidth={2.4} strokeLinecap="butt" />
      <rect x={14.5} y={11} width={4} height={3} rx={1.5} fill={C.pink} stroke={C.outline} strokeWidth={0.6} transform="rotate(-25 16.5 12.5)" />
    </svg>
  );
}

/** Lobby glyphs: reuses the HUD's sunglasses sun, sandcastle trophy and sun gear. */
export const SUMMER_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: SUMMER_ICONS.emotes,
  host: SUMMER_ICONS.trophy,
  emptySeat: SunbedIcon,
  divider: SUMMER_ICONS.settings,
};
