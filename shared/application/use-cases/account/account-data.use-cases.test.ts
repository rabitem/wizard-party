import { describe, expect, it } from 'vitest';

import type {
  AccountDocument,
  IAccountDocumentRepository,
  IAudioBlobStorage,
  ICustomSoundRepository,
  StoredCustomSound,
} from '../../ports/account';
import { ExportAccountDataUseCase, PurgeAccountStorageUseCase } from './account-data.use-cases';
import { DEFAULT_APPEARANCE } from '../../../domain/character';
import { MemoryCharacters, MemoryGameResults, MemoryProfiles, MemoryProgress } from './account-test-fakes';

const NOW = 1_800_000_000_000;
const clock = { now: () => NOW };

const sound = (userId: string, id: string): StoredCustomSound => ({
  id,
  name: `Sound ${id}`,
  url: `https://blob/${userId}/${id}.wav`,
  storageKey: `sounds/${userId}/${id}.wav`,
  size: 1024,
  duration: 1.5,
  category: 'custom',
  roles: { wizard: true, jester: false, trick: false, afk: false, shared: false },
  createdAt: NOW - 1000,
});

/** Sounds and documents per user; only what the GDPR use cases read. */
function storesFor(rows: Record<string, { sounds?: StoredCustomSound[]; documents?: AccountDocument[] }>) {
  const sounds: ICustomSoundRepository = {
    list: async (userId) => rows[userId]?.sounds ?? [],
    count: async (userId) => rows[userId]?.sounds?.length ?? 0,
    upsert: async () => undefined,
    updateMetadata: async () => false,
    remove: async () => null,
  };
  const documents: IAccountDocumentRepository = {
    list: async (userId) => rows[userId]?.documents ?? [],
    save: async () => ({ ok: false, reason: 'conflict', current: null }),
  };
  const deleted: string[][] = [];
  const storage: IAudioBlobStorage = {
    put: async (path) => ({ url: `https://blob/${path}`, storageKey: path }),
    delete: async (keys) => void deleted.push([...keys]),
  };
  return { sounds, documents, storage, deleted };
}

describe('ExportAccountDataUseCase', () => {
  it('should export everything stored about the player, and nothing of anyone else, in a portable form', async () => {
    const profiles = new MemoryProfiles();
    await profiles.ensure({ userId: 'u1', tagline: 'Hello', createdAt: NOW - 5000, isPublic: true, showHistory: false });
    await profiles.ensure({ userId: 'u2', tagline: 'Other', createdAt: NOW - 5000, isPublic: true, showHistory: false });
    const results = new MemoryGameResults();
    const played = { clientGameId: 'game-u1-00000001', playedAt: NOW - 2000, playerCount: 4, placement: 1, score: 50, rounds: [], xp: 40 };
    await results.insertMany('u1', [played]);
    await results.insertMany('u2', [{ ...played, clientGameId: 'game-u2-00000001' }]);
    const progress = new MemoryProgress(clock);
    await progress.unlock('u1', ['first-game', 'first-win'], NOW - 1500);
    const settings: AccountDocument = { key: 'game-settings', data: { theme: 'dark' }, version: 3, updatedAt: NOW - 100 };
    const stores = storesFor({ u1: { sounds: [sound('u1', 'boom')], documents: [settings] }, u2: { sounds: [sound('u2', 'other')] } });

    const characters = new MemoryCharacters();
    await characters.save('u1', DEFAULT_APPEARANCE);
    await characters.save('u2', { ...DEFAULT_APPEARANCE, palette: 'palette:shadow' });
    const exported = await new ExportAccountDataUseCase({ profiles, results, progress, documents: stores.documents, sounds: stores.sounds, characters })
      .execute('u1', { email: 'u1@example.test', username: 'merlin' });
    // The download is JSON: anything that does not survive serialisation is lost to the player.
    const portable = JSON.parse(JSON.stringify(exported)) as typeof exported;

    expect(portable.account).toEqual({ email: 'u1@example.test', username: 'merlin' });
    expect(portable.profile).toMatchObject({ userId: 'u1', tagline: 'Hello' });
    expect(portable.gameResults.map((game) => game.clientGameId)).toEqual(['game-u1-00000001']);
    expect(portable.progress.unlocked).toEqual({ 'first-game': NOW - 1500, 'first-win': NOW - 1500 });
    expect(portable.settings).toEqual([settings]);
    expect(portable.customSounds.map((s) => s.id)).toEqual(['boom']);
    expect(portable.character).toEqual(DEFAULT_APPEARANCE);
    expect(Number.isNaN(Date.parse(portable.exportedAt))).toBe(false);
  });
});

describe('PurgeAccountStorageUseCase', () => {
  it('should delete every uploaded blob of the player, and only theirs', async () => {
    const stores = storesFor({ u1: { sounds: [sound('u1', 'a'), sound('u1', 'b')] }, u2: { sounds: [sound('u2', 'c')] } });

    await new PurgeAccountStorageUseCase(stores.sounds, stores.storage).execute('u1');

    expect(stores.deleted.flat().sort()).toEqual(['sounds/u1/a.wav', 'sounds/u1/b.wav']);
  });

  it('should not call the blob store for a player without uploads', async () => {
    const stores = storesFor({});

    await new PurgeAccountStorageUseCase(stores.sounds, stores.storage).execute('u1');

    expect(stores.deleted).toEqual([]);
  });
});
