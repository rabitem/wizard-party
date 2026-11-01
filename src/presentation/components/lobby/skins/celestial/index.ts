import type { LobbySkin } from '../lobby-skin.types';
import { CELESTIAL_LOBBY_ICONS } from './celestial-lobby-icons';
import { CelestialAddBotDecor, CelestialPanelBackdrop, CelestialPanelDecor, CelestialStartDecor } from './celestial-lobby-panels';
import { CelestialHeaderDecor, CelestialScene } from './celestial-lobby-scene';
import { CelestialAvatarFrame, CelestialEmptySlotDecor, CelestialPlayerSlotDecor } from './celestial-lobby-seats';

/** Celestial lobby: an observatory night - gilded star-sign plaques, filigree, an astrolabe start. */
export const CELESTIAL_LOBBY_SKIN: LobbySkin = {
  Scene: CelestialScene,
  HeaderDecor: CelestialHeaderDecor,
  PanelBackdrop: CelestialPanelBackdrop,
  PanelDecor: CelestialPanelDecor,
  PlayerSlotDecor: CelestialPlayerSlotDecor,
  AvatarFrameDecor: CelestialAvatarFrame,
  EmptySlotDecor: CelestialEmptySlotDecor,
  AddBotDecor: CelestialAddBotDecor,
  StartButtonDecor: CelestialStartDecor,
  startButtonStyle: {
    ready: {
      color: '#fff0b8',
      textShadow: '0 1px 2px #0a0c24, 0 0 10px color-mix(in srgb, var(--color-amber-300) 55%, transparent)',
      border: 'none',
      boxShadow: '0 4px 22px rgba(74, 79, 168, 0.45)',
    },
    waiting: { color: 'color-mix(in srgb, var(--color-amber-300) 70%, transparent)', border: 'none' },
    guest: { color: 'color-mix(in srgb, var(--color-amber-300) 85%, transparent)' },
  },
  icons: CELESTIAL_LOBBY_ICONS,
  copy: {
    title: 'The Observatory',
    playersHeading: 'Stargazers',
    waitingForPlayer: 'A star yet to rise...',
    startReady: 'Align the Stars',
    startWaiting: 'Charting the heavens...',
    waitingForHost: 'The astronomer is aligning the stars...',
  },
  classNames: {
    title: 'tracking-[0.06em]',
    startButton: 'rounded-xl! tracking-[0.08em]',
  },
};
