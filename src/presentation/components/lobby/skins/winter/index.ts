import { WINTER_ICONS } from '@/presentation/components/hud/skins/winter/winter-icons';
import type { LobbySkin } from '../lobby-skin.types';
import { WinterAddBotDecor, WinterPanelBackdrop, WinterPanelDecor, WinterStartDecor } from './winter-lobby-panels';
import { WinterHeaderDecor, WinterScene } from './winter-lobby-scene';
import { WinterAvatarFrame, WinterEmptySlotDecor, WinterPlayerSlotDecor } from './winter-lobby-seats';

/** Winter lobby: an alpine lodge - sled sign seats, snowmen holding seats, a frosted start button. */
export const WINTER_LOBBY_SKIN: LobbySkin = {
  Scene: WinterScene,
  HeaderDecor: WinterHeaderDecor,
  PanelBackdrop: WinterPanelBackdrop,
  PanelDecor: WinterPanelDecor,
  PlayerSlotDecor: WinterPlayerSlotDecor,
  AvatarFrameDecor: WinterAvatarFrame,
  EmptySlotDecor: WinterEmptySlotDecor,
  AddBotDecor: WinterAddBotDecor,
  StartButtonDecor: WinterStartDecor,
  startButtonStyle: {
    ready: {
      color: '#0d2340',
      textShadow: '0 1px 0 rgba(255, 255, 255, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.7)',
      boxShadow: '0 4px 22px rgba(190, 225, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    waiting: { color: 'rgba(232, 246, 255, 0.85)', border: '2px solid rgba(191, 230, 255, 0.35)' },
  },
  icons: {
    emblem: WINTER_ICONS.emotes,
    host: WINTER_ICONS.trophy,
    emptySeat: WINTER_ICONS.sort,
    divider: WINTER_ICONS.shuffle,
  },
  copy: {
    title: 'Alpine Lodge',
    playersHeading: 'By the fireplace',
    waitingForPlayer: 'Building a snowman for you...',
    startReady: 'Hit the Slopes',
    startWaiting: 'Warming up by the fire...',
    waitingForHost: 'The host stokes the fire...',
  },
  classNames: {
    startButton: 'rounded-xl!',
  },
};
