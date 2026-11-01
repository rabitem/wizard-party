import { normalizeUsername, validateUsername } from '../../../domain/account/username';
import { buildPublicProfile, type PublicProfile } from '../../../domain/account/public-profile';
import type { IPublicProfileReader } from '../../ports/account/public-profile.port';

/** The public player card at /u/<username>; null for unknown, invalid or private handles. */
export class GetPublicProfileUseCase {
  constructor(private readonly reader: IPublicProfileReader) {}

  async execute(username: unknown): Promise<PublicProfile | null> {
    if (typeof username !== 'string' || validateUsername(username) !== null) return null;
    const source = await this.reader.findByUsername(normalizeUsername(username));
    return buildPublicProfile(source);
  }
}
