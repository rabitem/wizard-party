/**
 * The avatar ids players chose before characters. They can no longer be chosen; the stored id only
 * seeds the derived look (`appearanceForLegacyAvatar`), and settings validation keeps known ids.
 * Emotes have their own catalog (`EMOTES` in components/social), with the same ids.
 */
export interface AvatarPreset {
  id: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'wizard' },
  { id: 'knight' },
  { id: 'crown' },
  { id: 'dragon' },
  { id: 'sword' },
  { id: 'shield' },
  { id: 'axe' },
  { id: 'archer' },
  { id: 'scroll' },
  { id: 'potion' },
  { id: 'torch' },
  { id: 'skull' },
  { id: 'trophy' },
  { id: 'beer' },
  { id: 'jester' },
  { id: 'gem' },
  { id: 'hearts' },
  { id: 'eye' },
  { id: 'lightning' },
  { id: 'ghost' },
  { id: 'dice' },
  { id: 'brain' },
  { id: 'wolf' },
  { id: 'fire' },
  { id: 'muscle' },
  { id: 'fairy' },
  { id: 'crossed-swords' },
  { id: 'raven' },
  { id: 'health' },
  { id: 'spinning-sword' },
  { id: 'key' },
  { id: 'bat' },
];
