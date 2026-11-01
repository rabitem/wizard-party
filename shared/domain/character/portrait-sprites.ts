import { DEFAULT_APPEARANCE, type CharacterAppearance } from './appearance';
import { CHARACTER_PARTS, findCharacterPart, type CharacterSlot } from './character-catalog';

/*
 * Pre-rendered bust portraits for images drawn on the server (social emails, link previews), which
 * cannot render the 3D model. A sprite is keyed by what a bust shows most: the head, the headwear
 * and the palette. The other slots are fixed per sprite: the outfit of the head's set, and no cape,
 * props or familiar. The files are committed under public/characters/portraits and rendered by
 * scripts/characters/render-portrait-sprites.mjs.
 */

/** Public URL path of the sprite directory (the files live in public/ under the same path). */
export const PORTRAIT_SPRITE_DIR = '/characters/portraits';

/** The sprite of a player without a known look: guests, deleted or hidden accounts. */
export const SILHOUETTE_SPRITE_FILE = 'silhouette.png';

/** The outfit each head wears in its sprite: the one from the same adventurer set. */
const SPRITE_OUTFITS: Readonly<Record<string, string>> = {
  'head:mage': 'outfit:mage',
  'head:rogue': 'outfit:rogue',
  'head:rogue-hooded': 'outfit:rogue',
  'head:knight': 'outfit:knight',
  'head:barbarian': 'outfit:barbarian',
};

export interface PortraitSprite {
  file: string;
  /** The full look the sprite is rendered from. */
  appearance: CharacterAppearance;
}

const partIdsOf = (slot: CharacterSlot) => CHARACTER_PARTS.filter((part) => part.slot === slot).map((part) => part.id);

/** The part in `slot`, or the default one when the id is unknown or belongs to another slot. */
function spritePart(appearance: CharacterAppearance, slot: CharacterSlot): string {
  return findCharacterPart(appearance[slot])?.slot === slot ? appearance[slot] : DEFAULT_APPEARANCE[slot];
}

/** `head:rogue-hooded` -> `rogue-hooded`: ids are `<slot>:<name>`, names are kebab-case. */
const partName = (id: string) => id.slice(id.indexOf(':') + 1);

/** The three keyed slots, repaired like a stored look: unknown parts fall back, a hood drops headwear. */
function spriteKey(appearance: CharacterAppearance): Pick<CharacterAppearance, 'head' | 'headwear' | 'palette'> {
  const head = spritePart(appearance, 'head');
  const headwear = findCharacterPart(head)?.coversHead ? 'headwear:none' : spritePart(appearance, 'headwear');
  return { head, headwear, palette: spritePart(appearance, 'palette') };
}

function spriteFileOf({ head, headwear, palette }: Pick<CharacterAppearance, 'head' | 'headwear' | 'palette'>): string {
  return `${partName(head)}_${partName(headwear)}_${partName(palette)}.png`;
}

/** File name of the look's sprite in PORTRAIT_SPRITE_DIR; null (no known look) is the silhouette. */
export function portraitSpriteFile(appearance: CharacterAppearance | null): string {
  return appearance ? spriteFileOf(spriteKey(appearance)) : SILHOUETTE_SPRITE_FILE;
}

/** Site-relative URL path of the look's sprite, e.g. `/characters/portraits/mage_mage-hat_classic.png`. */
export function portraitSpritePath(appearance: CharacterAppearance | null): string {
  return `${PORTRAIT_SPRITE_DIR}/${portraitSpriteFile(appearance)}`;
}

/** Every sprite to render: each head with each headwear it may wear, in each palette. */
export function portraitSprites(): PortraitSprite[] {
  const sprites: PortraitSprite[] = [];
  for (const head of partIdsOf('head')) {
    const headwears = findCharacterPart(head)?.coversHead ? ['headwear:none'] : partIdsOf('headwear');
    for (const headwear of headwears) {
      for (const palette of partIdsOf('palette')) {
        const appearance: CharacterAppearance = {
          ...DEFAULT_APPEARANCE,
          head,
          headwear,
          palette,
          outfit: SPRITE_OUTFITS[head] ?? DEFAULT_APPEARANCE.outfit,
          cape: 'cape:none',
          mainHand: 'main:none',
          offHand: 'off:none',
          familiar: 'familiar:none',
        };
        sprites.push({ file: spriteFileOf({ head, headwear, palette }), appearance });
      }
    }
  }
  return sprites;
}
