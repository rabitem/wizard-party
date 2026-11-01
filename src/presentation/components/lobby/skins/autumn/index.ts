import type { LobbySkin } from '../lobby-skin.types';
import { AUTUMN_LOBBY_ICONS } from './autumn-lobby-icons';
import { AutumnAddBotDecor, AutumnPanelBackdrop, AutumnPanelDecor, AutumnStartDecor } from './autumn-lobby-panels';
import { AutumnHeaderDecor, AutumnScene } from './autumn-lobby-scene';
import { AutumnAvatarFrame, AutumnEmptySlotDecor, AutumnPlayerSlotDecor } from './autumn-lobby-seats';

/** Autumn lobby: a harvest festival - crate seats on hay bales, scarecrows, a cider barrel start. */
export const AUTUMN_LOBBY_SKIN: LobbySkin = {
  Scene: AutumnScene,
  HeaderDecor: AutumnHeaderDecor,
  PanelBackdrop: AutumnPanelBackdrop,
  PanelDecor: AutumnPanelDecor,
  PlayerSlotDecor: AutumnPlayerSlotDecor,
  AvatarFrameDecor: AutumnAvatarFrame,
  EmptySlotDecor: AutumnEmptySlotDecor,
  AddBotDecor: AutumnAddBotDecor,
  StartButtonDecor: AutumnStartDecor,
  startButtonStyle: {
    ready: {
      color: '#fff4dc',
      textShadow: '0 1px 2px color-mix(in srgb, var(--surface) 90%, transparent), 0 0 8px color-mix(in srgb, var(--color-amber-500) 45%, transparent)',
      border: '1px solid color-mix(in srgb, var(--color-amber-800) 90%, transparent)',
      boxShadow: '0 4px 20px color-mix(in srgb, var(--color-amber-600) 32%, transparent), inset 0 1px 0 color-mix(in srgb, var(--color-amber-300) 35%, transparent)',
    },
    waiting: { color: 'rgba(251, 239, 214, 0.85)', border: '2px solid color-mix(in srgb, var(--color-amber-600) 45%, transparent)' },
    guest: { color: 'rgba(251, 239, 214, 0.9)' },
  },
  icons: AUTUMN_LOBBY_ICONS,
  copy: {
    title: 'Harvest Festival',
    playersHeading: 'Around the hay bales',
    waitingForPlayer: 'The scarecrow saves your seat...',
    startReady: 'Bring in the Harvest',
    startWaiting: 'Gathering harvest hands...',
    waitingForHost: 'The host taps the cider barrel...',
  },
  classNames: {
    startButton: 'rounded-xl!',
  },
};
