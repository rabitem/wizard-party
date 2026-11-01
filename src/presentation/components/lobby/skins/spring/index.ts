import type { LobbySkin } from '../lobby-skin.types';
import { SPRING_LOBBY_ICONS } from './spring-lobby-icons';
import { SpringAddBotDecor, SpringPanelBackdrop, SpringPanelDecor, SpringStartDecor } from './spring-lobby-panels';
import { SpringHeaderDecor, SpringScene } from './spring-lobby-scene';
import { SpringAvatarFrame, SpringEmptySlotDecor, SpringPlayerSlotDecor } from './spring-lobby-seats';

/** Spring lobby: a blossom garden - picnic blanket seats, garden chairs, a blooming flower start. */
export const SPRING_LOBBY_SKIN: LobbySkin = {
  Scene: SpringScene,
  HeaderDecor: SpringHeaderDecor,
  PanelBackdrop: SpringPanelBackdrop,
  PanelDecor: SpringPanelDecor,
  PlayerSlotDecor: SpringPlayerSlotDecor,
  AvatarFrameDecor: SpringAvatarFrame,
  EmptySlotDecor: SpringEmptySlotDecor,
  AddBotDecor: SpringAddBotDecor,
  StartButtonDecor: SpringStartDecor,
  startButtonStyle: {
    ready: {
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(110, 24, 58, 0.9)',
      border: '1px solid rgba(255, 228, 236, 0.6)',
      boxShadow: '0 4px 20px rgba(255, 183, 200, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.45)',
    },
    waiting: { color: 'rgba(255, 238, 244, 0.88)', border: '2px solid rgba(255, 183, 200, 0.35)' },
    guest: { color: 'rgba(236, 255, 228, 0.9)' },
  },
  icons: SPRING_LOBBY_ICONS,
  copy: {
    title: 'Blossom Garden',
    playersHeading: 'On the picnic blankets',
    waitingForPlayer: 'A garden chair waits for you...',
    startReady: 'Let it Bloom',
    startWaiting: 'Waiting for buds to open...',
    waitingForHost: 'The host waters the garden...',
  },
  classNames: {
    startButton: 'rounded-2xl!',
  },
};
