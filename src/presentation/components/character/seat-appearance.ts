import { botAppearance, type CharacterAppearance } from '@shared/domain/character';

interface SeatIdentity {
  isLocal: boolean;
  isBot: boolean;
  botDifficulty?: number;
}

/**
 * The look of a seat at a table: the local player's own, a bot's by its difficulty, or the
 * account's look when the room told us whose seat it is. Anyone else gets a silhouette (null): a
 * guest, or a player the viewer cannot see (blocked, hidden, or the viewer is a guest).
 */
export function seatAppearance(
  seat: SeatIdentity,
  localAppearance: CharacterAppearance | null,
  accountAppearance: CharacterAppearance | undefined
): CharacterAppearance | null {
  if (seat.isLocal) return localAppearance;
  if (seat.isBot) return botAppearance(seat.botDifficulty);
  return accountAppearance ?? null;
}
