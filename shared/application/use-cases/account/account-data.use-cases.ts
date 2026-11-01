import type {
  IAccountDocumentRepository,
  IAudioBlobStorage,
  ICharacterRepository,
  ICustomSoundRepository,
  IGameResultRepository,
  IPlayerProgressRepository,
  IProfileRepository,
} from '../../ports/account';

/** Every store the export reads; a new store of player data belongs here. */
export interface AccountDataStores {
  profiles: IProfileRepository;
  results: IGameResultRepository;
  progress: IPlayerProgressRepository;
  documents: IAccountDocumentRepository;
  sounds: ICustomSoundRepository;
  characters: ICharacterRepository;
}

/** GDPR Art. 20: everything stored about the player in a portable format. */
export class ExportAccountDataUseCase {
  constructor(private readonly stores: AccountDataStores) {}

  async execute(userId: string, identity: Record<string, unknown>) {
    const { stores } = this;
    const [profile, results, progress, documents, sounds, character] = await Promise.all([
      stores.profiles.get(userId),
      stores.results.listAll(userId),
      stores.progress.get(userId),
      stores.documents.list(userId),
      stores.sounds.list(userId),
      stores.characters.get(userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      account: identity,
      profile,
      progress: { ...progress, unlocked: Object.fromEntries(progress.unlocked) },
      gameResults: results,
      settings: documents,
      customSounds: sounds,
      /** The saved character look, or null while none was saved. */
      character,
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
