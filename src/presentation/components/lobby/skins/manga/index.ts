import type { LobbySkin } from '../lobby-skin.types';
import { MANGA_LOBBY_ICONS } from './manga-lobby-icons';
import { MangaAddBotDecor, MangaPanelBackdrop, MangaPanelDecor, MangaStartDecor } from './manga-lobby-panels';
import { MangaHeaderDecor, MangaScene } from './manga-lobby-scene';
import { MangaAvatarFrame, MangaEmptySlotDecor, MangaPlayerSlotDecor } from './manga-lobby-seats';

/** Manga lobby: a shonen page spread - inked panels with character intros, a hanko "Let's Go!". */
export const MANGA_LOBBY_SKIN: LobbySkin = {
  Scene: MangaScene,
  HeaderDecor: MangaHeaderDecor,
  PanelBackdrop: MangaPanelBackdrop,
  PanelDecor: MangaPanelDecor,
  PlayerSlotDecor: MangaPlayerSlotDecor,
  AvatarFrameDecor: MangaAvatarFrame,
  EmptySlotDecor: MangaEmptySlotDecor,
  AddBotDecor: MangaAddBotDecor,
  StartButtonDecor: MangaStartDecor,
  startButtonStyle: {
    ready: {
      color: '#ffffff',
      textShadow: '2px 2px 0 #141416, -1px -1px 0 #141416, 1px -1px 0 #141416, -1px 1px 0 #141416',
      border: 'none',
      boxShadow: '0 6px 18px rgba(229, 38, 47, 0.35)',
    },
    waiting: { color: 'rgba(247, 243, 234, 0.75)', border: 'none' },
    guest: { color: 'rgba(247, 243, 234, 0.85)' },
  },
  icons: MANGA_LOBBY_ICONS,
  copy: {
    title: 'The Gathering Arc',
    playersHeading: 'Cast of Characters',
    waitingForPlayer: 'A new face appears soon...',
    startReady: "Let's Go!",
    startWaiting: 'Assembling the cast...',
    waitingForHost: 'Sensei is preparing the arena...',
  },
  classNames: {
    title: 'italic tracking-wide',
    playerRow: 'rounded-sm!',
    emptySlot: 'rounded-sm!',
    addBotRow: 'rounded-sm!',
    startButton: 'rounded-sm! italic uppercase tracking-[0.12em] font-black',
  },
};
