/**
 * The emote catalog: what the emote bar offers and the reactions feed shows. The id is what goes on
 * the wire (`SEND_EMOTE`, the `EMOTE` event), so ids never change once shipped; the worker only
 * checks their shape (`EMOTE_ID_PATTERN`). Icons are RPG-Awesome classes.
 */
export interface Emote {
  id: string;
  icon: string;
  label: string;
}

export const EMOTES: readonly Emote[] = [
  { id: 'wizard', icon: 'ra-crystal-ball', label: 'Wizard' },
  { id: 'knight', icon: 'ra-helmet', label: 'Knight' },
  { id: 'crown', icon: 'ra-crown', label: 'Royal' },
  { id: 'dragon', icon: 'ra-dragon', label: 'Dragon' },
  { id: 'sword', icon: 'ra-sword', label: 'Sword' },
  { id: 'shield', icon: 'ra-shield', label: 'Shield' },
  { id: 'axe', icon: 'ra-axe', label: 'Axe' },
  { id: 'archer', icon: 'ra-archer', label: 'Archer' },
  { id: 'scroll', icon: 'ra-scroll-unfurled', label: 'Scroll' },
  { id: 'potion', icon: 'ra-potion', label: 'Potion' },
  { id: 'torch', icon: 'ra-torch', label: 'Torch' },
  { id: 'skull', icon: 'ra-skull', label: 'Skull' },
  { id: 'trophy', icon: 'ra-trophy', label: 'Victory' },
  { id: 'beer', icon: 'ra-beer', label: 'Cheers' },
  { id: 'jester', icon: 'ra-player-king', label: 'Joker' },
  { id: 'gem', icon: 'ra-gem-pendant', label: 'Jackpot' },
  { id: 'hearts', icon: 'ra-hearts', label: 'Love' },
  { id: 'eye', icon: 'ra-aware', label: 'Watching' },
  { id: 'lightning', icon: 'ra-lightning-bolt', label: 'Shocked' },
  { id: 'ghost', icon: 'ra-death-skull', label: 'Spooky' },
  { id: 'dice', icon: 'ra-dice-six', label: 'Lucky' },
  { id: 'brain', icon: 'ra-book', label: 'Wise' },
  { id: 'wolf', icon: 'ra-wolf-howl', label: 'Howl' },
  { id: 'fire', icon: 'ra-fire', label: 'Hot' },
  { id: 'muscle', icon: 'ra-muscle-up', label: 'Flex' },
  { id: 'fairy', icon: 'ra-fairy', label: 'Magic' },
  { id: 'crossed-swords', icon: 'ra-crossed-swords', label: 'Fight' },
  { id: 'raven', icon: 'ra-raven', label: 'Omen' },
  { id: 'health', icon: 'ra-health', label: 'Health' },
  { id: 'spinning-sword', icon: 'ra-spinning-sword', label: 'Spin' },
  { id: 'key', icon: 'ra-key-basic', label: 'Key' },
  { id: 'bat', icon: 'ra-bat', label: 'Bat' },
];

const EMOTES_BY_ID = new Map(EMOTES.map((emote) => [emote.id, emote]));

/** The catalog entry of an emote id from the wire; undefined for ids this build does not know. */
export function findEmote(id: string): Emote | undefined {
  return EMOTES_BY_ID.get(id);
}
