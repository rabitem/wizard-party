/**
 * Character assets, built by scripts/characters/build-character-assets.mjs from the KayKit
 * Adventurers pack (CC0) and served from public/characters/. Both files are meshopt-compressed.
 */
export const CHARACTER_ASSETS = {
  /** One rig with every catalog part on it; nodes carry their part id in userData.part. */
  MODEL_URL: '/characters/characters.glb',
  /** The same rig without meshes, plus the clips below. Loaded only where characters move. */
  ANIMATIONS_URL: '/characters/character-animations.glb',
} as const;

/** Clip names in character-animations.glb (the manifest's `clips`). */
export const CHARACTER_CLIPS = {
  IDLE: 'Idle',
  CHEER: 'Cheer',
  INTERACT: 'Interact',
  USE_ITEM: 'Use_Item',
  SPELL_RAISE: 'Spellcast_Raise',
  SPELLCASTING: 'Spellcasting',
  HIT_A: 'Hit_A',
  HIT_B: 'Hit_B',
  SLUMP: 'Death_A',
  HOP: 'Jump_Full_Short',
  SIT_DOWN: 'Sit_Chair_Down',
  SIT_IDLE: 'Sit_Chair_Idle',
  STAND_UP: 'Sit_Chair_StandUp',
  ASLEEP: 'Lie_Idle',
} as const;

export type CharacterClip = (typeof CHARACTER_CLIPS)[keyof typeof CHARACTER_CLIPS];

/** Seconds to blend from one clip into the next. */
export const CHARACTER_CLIP_FADE_SECONDS = 0.25;
