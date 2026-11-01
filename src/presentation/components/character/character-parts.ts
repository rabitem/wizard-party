import type { Object3D } from 'three';
import { CHARACTER_SLOTS, type CharacterAppearance } from '@shared/domain/character';

/** The part ids an appearance shows, one per slot (`…:none` parts have no node and show nothing). */
export function appearancePartIds(appearance: CharacterAppearance): Set<string> {
  return new Set(CHARACTER_SLOTS.map((slot) => appearance[slot]));
}

/**
 * Shows the chosen parts of a cloned character model and hides the rest. Part nodes carry their
 * catalog id in userData.part (the glTF extras written by the asset build); everything else (the
 * rig) is left alone.
 */
export function applyAppearance(model: Object3D, appearance: CharacterAppearance): void {
  const shown = appearancePartIds(appearance);
  model.traverse((object) => {
    const part = object.userData.part as unknown;
    if (typeof part === 'string') object.visible = shown.has(part);
  });
}
