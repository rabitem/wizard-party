/**
 * userData of 3D text that decorates rather than informs (the crest engraved on a seat plate;
 * the seat's nameplate carries its information). Readability checks leave it out.
 */
export const DECORATIVE_TEXT_USER_DATA = Object.freeze({ decorativeText: true });

export function isDecorativeText(object: { userData: Record<string, unknown> }): boolean {
  return object.userData.decorativeText === true;
}
