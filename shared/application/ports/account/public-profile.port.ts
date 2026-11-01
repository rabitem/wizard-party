import type { PublicProfileSource } from '../../../domain/account/public-profile';

/**
 * Read model behind /u/<username>. Returns the raw data of a claimed handle (private data may be
 * included; the domain builder decides what is exposed) or null when no user has that handle.
 */
export interface IPublicProfileReader {
  /** `username` is already normalized (lowercase). */
  findByUsername(username: string): Promise<PublicProfileSource | null>;
}
