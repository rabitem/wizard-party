import { HALLOWEEN_ICONS } from '@/presentation/components/hud/skins/halloween/halloween-icons';
import { HALLOWEEN_PALETTE as C } from '@/presentation/components/hud/skins/halloween/halloween-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';
import styles from './halloween-lobby.module.css';

/** Empty seat: a carved pumpkin with nobody home - its candle gutters on and off. */
function EmptyPumpkinIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
      <path d="M12 6.5Q12 4 14 3" stroke={C.stemDark} strokeWidth={2.4} />
      <path d="M12 6.5Q12 4 14 3" stroke={C.stem} strokeWidth={1.4} />
      <ellipse cx={12} cy={14} rx={9} ry={7.2} fill={C.pumpkinDark} stroke={C.outline} strokeWidth={1} />
      <path d="M12 7v14M7.5 7.8Q5.5 14 7.5 20.2M16.5 7.8Q18.5 14 16.5 20.2" stroke={C.outline} strokeWidth={0.7} />
      <g className={styles.pumpkinFlicker} fill={C.glow}>
        <path d="M7 12.2L9.6 11L9.6 13.6Z" />
        <path d="M17 12.2L14.4 11L14.4 13.6Z" />
        <path d="M7.4 16Q12 19.6 16.6 16L15 16.8L14 15.9L12.8 17L11.2 17L10 15.9L9 16.8Z" />
      </g>
    </svg>
  );
}

/** Lobby glyphs: reuses the HUD's grinning pumpkin, cauldron trophy and pumpkin row. */
export const HALLOWEEN_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: HALLOWEEN_ICONS.emotes,
  host: HALLOWEEN_ICONS.trophy,
  emptySeat: EmptyPumpkinIcon,
  divider: HALLOWEEN_ICONS.menu,
};
