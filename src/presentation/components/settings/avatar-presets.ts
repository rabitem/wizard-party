// Avatar presets - using RPG-Awesome icon classes
export interface AvatarPreset {
  id: string;
  icon: string; // RPG-Awesome icon class (e.g., 'ra-crown')
  symbol: string; // Unicode symbol fallback for canvas/3D rendering
  label: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Original avatars/emotes
  { id: 'wizard', icon: 'ra-crystal-ball', symbol: '🔮', label: 'Wizard' },
  { id: 'knight', icon: 'ra-helmet', symbol: '⚔', label: 'Knight' },
  { id: 'crown', icon: 'ra-crown', symbol: '♔', label: 'Royal' },
  { id: 'dragon', icon: 'ra-dragon', symbol: '🐉', label: 'Dragon' },
  { id: 'sword', icon: 'ra-sword', symbol: '†', label: 'Sword' },
  { id: 'shield', icon: 'ra-shield', symbol: '⛨', label: 'Shield' },
  { id: 'axe', icon: 'ra-axe', symbol: '⚒', label: 'Axe' },
  { id: 'archer', icon: 'ra-archer', symbol: '➹', label: 'Archer' },
  { id: 'scroll', icon: 'ra-scroll-unfurled', symbol: '📜', label: 'Scroll' },
  { id: 'potion', icon: 'ra-potion', symbol: '⚗', label: 'Potion' },
  { id: 'torch', icon: 'ra-torch', symbol: '🔥', label: 'Torch' },
  { id: 'skull', icon: 'ra-skull', symbol: '💀', label: 'Skull' },
  // Additional banter/reaction emotes
  { id: 'trophy', icon: 'ra-trophy', symbol: '🏆', label: 'Victory' },
  { id: 'beer', icon: 'ra-beer', symbol: '🍺', label: 'Cheers' },
  { id: 'jester', icon: 'ra-player-king', symbol: '🃏', label: 'Joker' },
  { id: 'gem', icon: 'ra-gem-pendant', symbol: '💎', label: 'Jackpot' },
  { id: 'hearts', icon: 'ra-hearts', symbol: '❤', label: 'Love' },
  { id: 'eye', icon: 'ra-aware', symbol: '👁', label: 'Watching' },
  { id: 'lightning', icon: 'ra-lightning-bolt', symbol: '⚡', label: 'Shocked' },
  { id: 'ghost', icon: 'ra-death-skull', symbol: '👻', label: 'Spooky' },
  { id: 'dice', icon: 'ra-dice-six', symbol: '🎲', label: 'Lucky' },
  { id: 'brain', icon: 'ra-book', symbol: '📖', label: 'Wise' },
  { id: 'wolf', icon: 'ra-wolf-howl', symbol: '🐺', label: 'Howl' },
  { id: 'fire', icon: 'ra-fire', symbol: '🔥', label: 'Hot' },
  // New emotes for expanded reactions
  { id: 'muscle', icon: 'ra-muscle-up', symbol: '💪', label: 'Flex' },
  { id: 'fairy', icon: 'ra-fairy', symbol: '🧚', label: 'Magic' },
  { id: 'crossed-swords', icon: 'ra-crossed-swords', symbol: '⚔️', label: 'Fight' },
  { id: 'raven', icon: 'ra-raven', symbol: '🦅', label: 'Omen' },
  { id: 'health', icon: 'ra-health', symbol: '💖', label: 'Health' },
  { id: 'spinning-sword', icon: 'ra-spinning-sword', symbol: '🌀', label: 'Spin' },
  { id: 'key', icon: 'ra-key-basic', symbol: '🔑', label: 'Key' },
  { id: 'bat', icon: 'ra-bat', symbol: '🦇', label: 'Bat' },
];
