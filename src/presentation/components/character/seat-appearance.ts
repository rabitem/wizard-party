import { botAppearance, type CharacterAppearance } from '@shared/domain/character';

interface SeatIdentity {
  isLocal: boolean;
  isBot: boolean;
  botDifficulty?: number;
  /** The look the room verified for the seat (IPlayer.appearance); absent from older workers. */
  appearance?: CharacterAppearance;
}

/**
 * The look of a seat at a table: the local player's own, a bot's by its difficulty, the look the
 * room verified with the player's character ticket, or the account's look the social API found
 * for the seat. Anyone else gets a silhouette (null): a guest, or a signed-in player on a worker
 * that does not carry looks yet whom the viewer cannot see.
 */
export function seatAppearance(
  seat: SeatIdentity,
  localAppearance: CharacterAppearance | null,
  accountAppearance: CharacterAppearance | undefined
): CharacterAppearance | null {
  if (seat.isLocal) return localAppearance;
  if (seat.isBot) return botAppearance(seat.botDifficulty);
  return seat.appearance ?? accountAppearance ?? null;
}
