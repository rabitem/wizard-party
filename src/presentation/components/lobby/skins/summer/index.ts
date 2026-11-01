import type { LobbySkin } from '../lobby-skin.types';
import { SUMMER_LOBBY_ICONS } from './summer-lobby-icons';
import { SummerAddBotDecor, SummerPanelBackdrop, SummerPanelDecor, SummerStartDecor } from './summer-lobby-panels';
import { SummerHeaderDecor, SummerScene } from './summer-lobby-scene';
import { SummerAvatarFrame, SummerEmptySlotDecor, SummerPlayerSlotDecor } from './summer-lobby-seats';

/** Summer lobby: a beach club at sunset - towels and deck chairs per seat, a pool start button. */
export const SUMMER_LOBBY_SKIN: LobbySkin = {
  Scene: SummerScene,
  HeaderDecor: SummerHeaderDecor,
  PanelBackdrop: SummerPanelBackdrop,
  PanelDecor: SummerPanelDecor,
  PlayerSlotDecor: SummerPlayerSlotDecor,
  AvatarFrameDecor: SummerAvatarFrame,
  EmptySlotDecor: SummerEmptySlotDecor,
  AddBotDecor: SummerAddBotDecor,
  StartButtonDecor: SummerStartDecor,
  startButtonStyle: {
    ready: {
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(0, 40, 50, 0.85)',
      border: 'none',
      boxShadow: '0 4px 20px rgba(46, 211, 198, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
    },
    waiting: { color: 'rgba(225, 250, 250, 0.85)', border: '2px solid rgba(46, 211, 198, 0.35)' },
  },
  icons: SUMMER_LOBBY_ICONS,
  copy: {
    title: 'Beach Club',
    playersHeading: 'On the sunbeds',
    waitingForPlayer: 'Saving you a sunbed...',
    startReady: 'Dive In!',
    startWaiting: 'Waiting for swimmers...',
    waitingForHost: 'The lifeguard checks the water...',
  },
  classNames: {
    startButton: 'rounded-2xl!',
  },
};
