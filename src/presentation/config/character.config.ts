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

/** Head-and-shoulders portraits, rendered in the browser (character-portrait-renderer.ts). */
export const CHARACTER_PORTRAIT = {
  /** Rendered square size in device pixels; CSS scales it down. */
  SIZE_PX: 256,
  FOV_DEGREES: 26,
  /** Camera position relative to the head bone, in model units (the figure is about 2.7 tall). */
  CAMERA_OFFSET: [0, 0.6, 4.6] as const,
  /** Where the camera looks, relative to the head bone: above it, so tall hats fit. */
  TARGET_OFFSET: [0, 0.45, 0] as const,
  /** Time into the idle clip used as the portrait pose, in seconds. */
  POSE_SECONDS: 0.4,
  /** Rendered portraits kept per page; the oldest are dropped first. */
  CACHE_LIMIT: 200,
} as const;

/** The account's Character tab (CharacterPreview). */
export const CHARACTER_EDITOR = {
  CAMERA_POSITION: [0, 1.6, 7] as const,
  CAMERA_TARGET: [0, 1.35, 0] as const,
  FOV_DEGREES: 35,
  /** How long the character cheers after a save. */
  CHEER_MS: 2400,
} as const;
