import type { LobbySkin } from '../lobby-skin.types';
import { NEON_LOBBY_ICONS } from './neon-lobby-icons';
import { NeonAddBotDecor, NeonPanelBackdrop, NeonPanelDecor, NeonStartDecor } from './neon-lobby-panels';
import { NeonHeaderDecor, NeonScene } from './neon-lobby-scene';
import { NeonAvatarFrame, NeonEmptySlotDecor, NeonPlayerSlotDecor } from './neon-lobby-seats';

/** Neon lobby: a synthwave rooftop - arcade "player select" frames, neon tubes, a glowing start pad. */
export const NEON_LOBBY_SKIN: LobbySkin = {
  Scene: NeonScene,
  HeaderDecor: NeonHeaderDecor,
  PanelBackdrop: NeonPanelBackdrop,
  PanelDecor: NeonPanelDecor,
  PlayerSlotDecor: NeonPlayerSlotDecor,
  AvatarFrameDecor: NeonAvatarFrame,
  EmptySlotDecor: NeonEmptySlotDecor,
  AddBotDecor: NeonAddBotDecor,
  StartButtonDecor: NeonStartDecor,
  startButtonStyle: {
    ready: {
      color: '#ffffff',
      textShadow: '0 0 6px #ff3fd2, 0 0 14px rgba(255, 63, 210, 0.7)',
      border: 'none',
      boxShadow: '0 0 24px rgba(255, 63, 210, 0.45), 0 8px 26px rgba(46, 242, 255, 0.2)',
    },
    waiting: { color: 'rgba(255, 220, 250, 0.8)', border: '2px solid rgba(178, 100, 255, 0.35)' },
  },
  icons: NEON_LOBBY_ICONS,
  copy: {
    title: 'Player Select',
    playersHeading: 'Roster',
    waitingForPlayer: 'Awaiting challenger...',
    startReady: 'Press Start',
    startWaiting: 'Awaiting challengers...',
    waitingForHost: 'The host is picking the stage...',
  },
  classNames: {
    title: 'uppercase tracking-[0.12em]',
    startButton: 'rounded-lg! uppercase tracking-[0.16em]',
  },
};
