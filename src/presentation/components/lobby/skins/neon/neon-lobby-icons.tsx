import type { ReactNode } from 'react';
import { NEON_ICONS } from '@/presentation/components/hud/skins/neon/neon-icons';
import { NEON_PALETTE as C } from '@/presentation/components/hud/skins/neon/neon-palette';
import type { LobbyIconComponent, LobbyIconId } from '../lobby-skin.types';
import styles from './neon-lobby.module.css';

function NeonLobbySvg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`${styles.iconGlow} ${className ?? ''}`}>
      {children}
    </svg>
  );
}

/** One neon tube along `d`: dark backing, coloured glass, white-hot core (like the HUD icons). */
function Tube({ d, color, width = 2 }: { d: string; color: string; width?: number }) {
  return (
    <g>
      <path d={d} stroke={C.outline} strokeWidth={width + 1.6} />
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke={C.core} strokeWidth={width * 0.35} opacity={0.85} />
    </g>
  );
}

/** Emblem: an arcade joystick with a glowing ball top and two buttons. */
function JoystickIcon({ className }: { className?: string }) {
  return (
    <NeonLobbySvg className={className}>
      <Tube d="M4 17.5H20V20.5H4Z" color={C.purple} width={1.6} />
      <Tube d="M10 17.5L11.5 10" color={C.cyan} width={1.6} />
      <circle cx={11.8} cy={7.6} r={3} fill={C.pink} stroke={C.outline} strokeWidth={0.8} />
      <circle cx={11} cy={6.8} r={0.9} fill={C.core} opacity={0.8} />
      <circle cx={16} cy={15.6} r={1.2} fill={C.yellow} />
      <circle cx={19} cy={15.6} r={1.2} fill={C.cyan} />
    </NeonLobbySvg>
  );
}

/** Empty seat: a blinking coin. */
function CoinIcon({ className }: { className?: string }) {
  return (
    <NeonLobbySvg className={`${styles.coinBlink} ${className ?? ''}`}>
      <Tube d="M12 4.5A7.5 7.5 0 1 1 11.99 4.5Z" color={C.yellow} width={1.8} />
      <Tube d="M12 8.5V15.5" color={C.yellow} width={1.6} />
    </NeonLobbySvg>
  );
}

/** Start: a glowing play triangle. */
function PlayIcon({ className }: { className?: string }) {
  return (
    <NeonLobbySvg className={className}>
      <Tube d="M8 5.5L18.5 12L8 18.5Z" color={C.cyan} width={1.8} />
    </NeonLobbySvg>
  );
}

/** Lobby glyphs: reuses the HUD's neon cup and neon rings. */
export const NEON_LOBBY_ICONS: Partial<Record<LobbyIconId, LobbyIconComponent>> = {
  emblem: JoystickIcon,
  host: NEON_ICONS.trophy,
  emptySeat: CoinIcon,
  start: PlayIcon,
  divider: NEON_ICONS.menu,
};
