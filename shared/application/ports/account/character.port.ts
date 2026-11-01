import type { CharacterAppearance } from '../../../domain/character';

/** The character a player saved (player_profiles.appearance). Rows are created by EnsureProfile. */
export interface ICharacterRepository {
  /** The stored JSON as is (untrusted: parsed by the domain), or null when none was saved. */
  get(userId: string): Promise<unknown | null>;
  save(userId: string, appearance: CharacterAppearance): Promise<void>;
}
