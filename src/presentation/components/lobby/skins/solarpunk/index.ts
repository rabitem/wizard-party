import type { LobbySkin } from '../lobby-skin.types';
import { SOLARPUNK_LOBBY_ICONS } from './solarpunk-lobby-icons';
import { SolarpunkAddBotDecor, SolarpunkPanelBackdrop, SolarpunkPanelDecor, SolarpunkStartDecor } from './solarpunk-lobby-panels';
import { SolarpunkHeaderDecor, SolarpunkScene } from './solarpunk-lobby-scene';
import { SolarpunkAvatarFrame, SolarpunkEmptySlotDecor, SolarpunkPlayerSlotDecor } from './solarpunk-lobby-seats';

/** Solarpunk lobby: a greenhouse commons - brass plaques, planters, a sun-charged seed pod start. */
export const SOLARPUNK_LOBBY_SKIN: LobbySkin = {
  Scene: SolarpunkScene,
  HeaderDecor: SolarpunkHeaderDecor,
  PanelBackdrop: SolarpunkPanelBackdrop,
  PanelDecor: SolarpunkPanelDecor,
  PlayerSlotDecor: SolarpunkPlayerSlotDecor,
  AvatarFrameDecor: SolarpunkAvatarFrame,
  EmptySlotDecor: SolarpunkEmptySlotDecor,
  AddBotDecor: SolarpunkAddBotDecor,
  StartButtonDecor: SolarpunkStartDecor,
  startButtonStyle: {
    ready: {
      color: '#1f2b22',
      textShadow: '0 1px 0 color-mix(in srgb, var(--color-amber-300) 70%, transparent)',
      border: '1px solid color-mix(in srgb, var(--color-amber-700) 90%, transparent)',
      boxShadow: '0 4px 22px color-mix(in srgb, var(--color-amber-300) 35%, transparent), inset 0 1px 0 rgba(255, 250, 225, 0.8)',
    },
    waiting: { color: 'rgba(251, 245, 227, 0.85)', border: '2px solid color-mix(in srgb, var(--color-amber-500) 40%, transparent)' },
    guest: { color: 'rgba(236, 252, 238, 0.9)' },
  },
  icons: SOLARPUNK_LOBBY_ICONS,
  copy: {
    title: 'Greenhouse Commons',
    playersHeading: 'Around the planters',
    waitingForPlayer: 'A seedling waits for you...',
    startReady: 'Grow Together',
    startWaiting: 'Charging the solar sails...',
    waitingForHost: 'The host tends the greenhouse...',
  },
  classNames: {
    startButton: 'rounded-xl!',
  },
};
