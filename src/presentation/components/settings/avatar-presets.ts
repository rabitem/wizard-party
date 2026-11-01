/**
 * The avatar ids players chose before characters. They can no longer be chosen; the stored id still
 * seeds the derived look (`appearanceForLegacyAvatar`), settings validation keeps known ids, a guest
 * gets one from their player id, and the seat mark on the 3D table draws its symbol. Emotes have
 * their own catalog (`EMOTES` in components/social), with the same ids.
 */
export interface AvatarPreset {
  id: string;
  /** Unicode symbol for canvas and 3D rendering. */
  symbol: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'wizard', symbol: '🔮' },
  { id: 'knight', symbol: '⚔' },
  { id: 'crown', symbol: '♔' },
  { id: 'dragon', symbol: '🐉' },
  { id: 'sword', symbol: '†' },
  { id: 'shield', symbol: '⛨' },
  { id: 'axe', symbol: '⚒' },
  { id: 'archer', symbol: '➹' },
  { id: 'scroll', symbol: '📜' },
  { id: 'potion', symbol: '⚗' },
  { id: 'torch', symbol: '🔥' },
  { id: 'skull', symbol: '💀' },
  { id: 'trophy', symbol: '🏆' },
  { id: 'beer', symbol: '🍺' },
  { id: 'jester', symbol: '🃏' },
  { id: 'gem', symbol: '💎' },
  { id: 'hearts', symbol: '❤' },
  { id: 'eye', symbol: '👁' },
  { id: 'lightning', symbol: '⚡' },
  { id: 'ghost', symbol: '👻' },
  { id: 'dice', symbol: '🎲' },
  { id: 'brain', symbol: '📖' },
  { id: 'wolf', symbol: '🐺' },
  { id: 'fire', symbol: '🔥' },
  { id: 'muscle', symbol: '💪' },
  { id: 'fairy', symbol: '🧚' },
  { id: 'crossed-swords', symbol: '⚔️' },
  { id: 'raven', symbol: '🦅' },
  { id: 'health', symbol: '💖' },
  { id: 'spinning-sword', symbol: '🌀' },
  { id: 'key', symbol: '🔑' },
  { id: 'bat', symbol: '🦇' },
];
