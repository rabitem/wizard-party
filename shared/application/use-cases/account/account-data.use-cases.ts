import type {
  IAccountDocumentRepository,
  IAudioBlobStorage,
  ICustomSoundRepository,
  IGameResultRepository,
  IPlayerProgressRepository,
  IProfileRepository,
} from '../../ports/account';

/** GDPR Art. 20: everything stored about the player in a portable format. */
export class ExportAccountDataUseCase {
  constructor(
    private readonly profiles: IProfileRepository,
    private readonly results: IGameResultRepository,
    private readonly progress: IPlayerProgressRepository,
    private readonly documents: IAccountDocumentRepository,
    private readonly sounds: ICustomSoundRepository
  ) {}

  async execute(userId: string, identity: Record<string, unknown>) {
    const [profile, results, progress, documents, sounds] = await Promise.all([
      this.profiles.get(userId),
      this.results.listAll(userId),
      this.progress.get(userId),
      this.documents.list(userId),
      this.sounds.list(userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      account: identity,
      profile,
      progress: { ...progress, unlocked: Object.fromEntries(progress.unlocked) },
      gameResults: results,
      settings: documents,
      customSounds: sounds,
      /** Filled by other bounded contexts (e.g. friends and inbox) before download. */
      social: undefined as unknown,
      /** Filled by the tournament context (hosted and entered tournaments, results, trophies). */
      tournaments: undefined as unknown,
    };
  }
}

/**
 * Removes data that lives outside the database before the user row is deleted. Rows are
 * removed by ON DELETE CASCADE, so this only has to care about external storage.
 */
export class PurgeAccountStorageUseCase {
  constructor(
    private readonly sounds: ICustomSoundRepository,
    private readonly storage: IAudioBlobStorage
  ) {}

  async execute(userId: string): Promise<void> {
    const sounds = await this.sounds.list(userId);
    if (sounds.length > 0) await this.storage.delete(sounds.map((sound) => sound.storageKey));
  }
}
