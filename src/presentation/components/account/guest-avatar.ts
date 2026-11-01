/**
 * Guests cannot choose an avatar (that comes with an account); they get one picked from their
 * browser's player id, so it stays the same across visits and reloads.
 */
export function guestAvatarId(seed: string, avatarIds: readonly string[]): string {
  // FNV-1a: cheap, stable across engines, and spreads similar ids apart.
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return avatarIds[hash % avatarIds.length];
}
