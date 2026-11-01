import type { Object3D } from 'three';

/** userData flag of subtrees whose motion is decorative (never forces full-rate frames). */
export const AMBIENT_USER_DATA_KEY = 'renderActivity';
const AMBIENT_VALUE = 'ambient';

export function isAmbient(object: Object3D): boolean {
  return object.userData[AMBIENT_USER_DATA_KEY] === AMBIENT_VALUE;
}

/**
 * JSX userData prop that marks a group or mesh (and everything below it) as ambient: idle
 * breathing, room decor, sparkles. Ambient motion still renders, but at the scheduler's ambient
 * rate while nothing else moves.
 */
export const AMBIENT_USER_DATA: Readonly<Record<string, string>> = { [AMBIENT_USER_DATA_KEY]: AMBIENT_VALUE };
