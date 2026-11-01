import type { LobbySkin } from '../lobby-skin.types';
import { HALLOWEEN_LOBBY_ICONS } from './halloween-lobby-icons';
import { HalloweenAddBotDecor, HalloweenPanelBackdrop, HalloweenPanelDecor, HalloweenStartDecor } from './halloween-lobby-panels';
import { HalloweenHeaderDecor, HalloweenScene } from './halloween-lobby-scene';
import { HalloweenAvatarFrame, HalloweenEmptySlotDecor, HalloweenPlayerSlotDecor } from './halloween-lobby-seats';

/** Halloween lobby: a haunted manor - headstone seats, empty graves, a bubbling cauldron start. */
export const HALLOWEEN_LOBBY_SKIN: LobbySkin = {
  Scene: HalloweenScene,
  HeaderDecor: HalloweenHeaderDecor,
  PanelBackdrop: HalloweenPanelBackdrop,
  PanelDecor: HalloweenPanelDecor,
  PlayerSlotDecor: HalloweenPlayerSlotDecor,
  AvatarFrameDecor: HalloweenAvatarFrame,
  EmptySlotDecor: HalloweenEmptySlotDecor,
  AddBotDecor: HalloweenAddBotDecor,
  StartButtonDecor: HalloweenStartDecor,
  startButtonStyle: {
    ready: {
      color: '#eaffd6',
      textShadow: '0 0 8px rgba(125, 220, 63, 0.75), 0 1px 2px #000000',
      border: '1px solid rgba(125, 220, 63, 0.5)',
      boxShadow: '0 4px 22px rgba(125, 220, 63, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
    },
    waiting: { color: 'rgba(236, 230, 214, 0.8)', border: '2px solid rgba(123, 63, 168, 0.45)' },
  },
  icons: HALLOWEEN_LOBBY_ICONS,
  copy: {
    title: 'Haunted Manor',
    playersHeading: 'Guests of the manor',
    waitingForPlayer: 'An empty grave awaits...',
    startReady: 'Summon the Game',
    startWaiting: 'Gathering spirits...',
    waitingForHost: 'The host stirs the cauldron...',
  },
  classNames: {
    startButton: 'rounded-xl!',
  },
};
