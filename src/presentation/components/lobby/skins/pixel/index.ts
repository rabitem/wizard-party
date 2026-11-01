import type { LobbySkin } from '../lobby-skin.types';
import { PIXEL_LOBBY_ICONS } from './pixel-lobby-icons';
import { PixelAddBotDecor, PixelPanelBackdrop, PixelPanelDecor, PixelStartDecor } from './pixel-lobby-panels';
import { PixelHeaderDecor, PixelScene } from './pixel-lobby-scene';
import { PixelAvatarFrame, PixelEmptySlotDecor, PixelPlayerSlotDecor } from './pixel-lobby-seats';

/** Pixel lobby: an 8-bit arcade night - player-select slots, stepped borders, a chunky START key. */
export const PIXEL_LOBBY_SKIN: LobbySkin = {
  Scene: PixelScene,
  HeaderDecor: PixelHeaderDecor,
  PanelBackdrop: PixelPanelBackdrop,
  PanelDecor: PixelPanelDecor,
  PlayerSlotDecor: PixelPlayerSlotDecor,
  AvatarFrameDecor: PixelAvatarFrame,
  EmptySlotDecor: PixelEmptySlotDecor,
  AddBotDecor: PixelAddBotDecor,
  StartButtonDecor: PixelStartDecor,
  startButtonStyle: {
    ready: {
      color: '#fafaf2',
      textShadow: '2px 2px 0 rgba(12, 10, 24, 0.85)',
      border: 'none',
      boxShadow: 'none',
    },
    waiting: { color: 'rgba(250, 250, 242, 0.7)', border: 'none', boxShadow: 'none' },
    guest: { color: 'rgba(250, 250, 242, 0.85)', border: 'none' },
  },
  icons: PIXEL_LOBBY_ICONS,
  copy: {
    title: 'Arcade Lobby',
    playersHeading: 'Player Roster',
    waitingForPlayer: 'Free slot...',
    startReady: 'START',
    startWaiting: 'Need more players...',
    waitingForHost: 'Loading next stage...',
  },
  classNames: {
    title: 'uppercase tracking-[0.14em] font-mono',
    playerRow: 'rounded-none!',
    emptySlot: 'rounded-none! border-transparent!',
    addBotRow: 'rounded-none! border-transparent!',
    startButton: 'rounded-none! uppercase tracking-[0.22em] font-mono',
    guestWaiting: 'rounded-none! font-mono',
  },
};
