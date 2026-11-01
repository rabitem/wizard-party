import { Blossom, SPRING_ICONS } from '@/presentation/components/hud/skins/spring/spring-icons';
import { SPRING_PALETTE as C } from '@/presentation/components/hud/skins/spring/spring-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';

/** Host: a woven flower crown - a leafy band topped with three blossoms (24x24 grid like lucide). */
function FlowerCrownIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M3 16Q12 21 21 16" stroke={C.leafDark} strokeWidth={3} />
      <path d="M3 16Q12 21 21 16" stroke={C.leaf} strokeWidth={1.8} />
      <path d="M5 17.2l-1.6 2.4M9 18.8l-0.8 2.6M15 18.8l0.8 2.6M19 17.2l1.6 2.4" stroke={C.leafDark} strokeWidth={1.2} />
      <Blossom cx={6} cy={13.6} size={3.4} color={C.tulipPurple} rim={C.tulipPurpleDark} />
      <Blossom cx={18} cy={13.6} size={3.4} color={C.yellow} rim={C.yellowDark} />
      <Blossom cx={12} cy={10.4} size={4.6} />
    </svg>
  );
}

/** Start: a single open cherry blossom. */
function BlossomIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <Blossom cx={12} cy={12.6} size={8.4} color={C.blossomLight} rim={C.blossomDark} />
    </svg>
  );
}

/** Lobby glyphs: the HUD's smiling flower, watering can and flower gear plus a crown and a blossom. */
export const SPRING_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: SPRING_ICONS.emotes,
  host: FlowerCrownIcon,
  emptySeat: SPRING_ICONS.trophy,
  start: BlossomIcon,
  divider: SPRING_ICONS.settings,
};
