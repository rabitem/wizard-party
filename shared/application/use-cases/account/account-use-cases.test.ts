import { describe, expect, it } from 'vitest';

import { ACCOUNT_LIMITS, xpForGame } from '../../../domain/account';
import { CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES } from '../../../domain/constants/sound-options';
import type { TournamentParticipation } from '../../../domain/tournament';
import type {
  AccountDocument,
  IAccountDocumentRepository,
  IAudioBlobStorage,
  ICustomSoundRepository,
  StoredCustomSound,
} from '../../ports/account';
import { MemoryGameResults, MemoryProgress, MemoryTournamentHistory } from './account-test-fakes';
import {
  AccountError,
  ImportGuestProgressUseCase,
  PlayerProgressRefresher,
  ProgressCalculator,
  RecordGameResultsUseCase,
  SaveAccountDocumentUseCase,
  UploadCustomSoundUseCase,
  sniffAudioFormat,
} from './index';
import { DeleteCustomSoundUseCase, UpdateCustomSoundUseCase } from './custom-sounds.use-cases';

const NOW = 1_800_000_000_000;
const clock = { now: () => NOW };

function setup() {
  const results = new MemoryGameResults();
  const progress = new MemoryProgress(clock);
  const tournaments = new MemoryTournamentHistory();
  const calculator = new ProgressCalculator(results, progress, tournaments, clock);
  return { results, progress, tournaments, calculator };
}

const result = (id: string, placement = 1) => ({
  clientGameId: `game-${id}-xxxxxxxx`,
  playedAt: NOW - 1000,
  playerCount: 4,
  placement,
  score: 50,
  rounds: [{ bid: 1, tricksWon: 1, roundScore: 30 }, { bid: 0, tricksWon: 0, roundScore: 20 }],
});

describe('RecordGameResultsUseCase', () => {
  it('should record results idempotently and unlock achievements once', async () => {
    const { results, progress, calculator } = setup();
    const useCase = new RecordGameResultsUseCase(results, calculator, clock);

    const first = await useCase.execute('u1', [result('a')]);
    expect(first.recorded).toEqual(['game-a-xxxxxxxx']);
    expect(first.newlyUnlocked).toEqual(expect.arrayContaining(['first-game', 'first-win']));

    const replay = await useCase.execute('u1', [result('a')]);
    expect(replay.recorded).toEqual([]);
    expect(replay.newlyUnlocked).toEqual([]);
    expect(replay.stats.gamesPlayed).toBe(1);
    expect(progress.snapshots.get('u1')?.summary.gamesPlayed).toBe(1);
  });

  it('should reject invalid batches', async () => {
    const { results, calculator } = setup();
    const useCase = new RecordGameResultsUseCase(results, calculator, clock);
    await expect(useCase.execute('u1', [{ nope: true }])).rejects.toBeInstanceOf(AccountError);
    await expect(useCase.execute('u1', 'nope')).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('ImportGuestProgressUseCase', () => {
  it('should import once and count games beyond the history as baseline', async () => {
    const { results, progress, calculator } = setup();
    const useCase = new ImportGuestProgressUseCase(results, progress, calculator, clock);
    const stats = {
      gamesPlayed: 12, gamesWon: 5, totalScore: 700, totalRounds: 60, correctBids: 30, totalBids: 60,
      totalTricksWon: 70, highestScore: 180, lowestScore: -30, bestWinStreak: 3, currentWinStreak: 1, totalPlacement: 24,
    };

    const view = await useCase.execute('u1', { stats, history: [result('a'), result('b', 2)] });
    expect(view.stats.gamesPlayed).toBe(12);
    expect(view.stats.gamesWon).toBe(5);
    expect(view.progression.totalXp).toBeGreaterThan(0);

    await expect(useCase.execute('u1', { stats, history: [] })).rejects.toMatchObject({ code: 'already_imported' });
  });
});

const championship = (overrides: Partial<TournamentParticipation> = {}): TournamentParticipation => ({
  tournamentId: 'tourney0001',
  name: 'Midsummer Cup',
  format: 'series',
  finishedAt: NOW - 500,
  entrants: 9,
  wasHost: false,
  wasEntrant: true,
  finalRank: 1,
  matchesPlayed: 3,
  tableWins: 2,
  roundsPlayed: 3,
  totalRounds: 3,
  flawless: false,
  awards: [{ awardId: 'champion', tier: 'gold', xp: 400 }, { awardId: 'finisher', tier: 'participation', xp: 50 }],
  ...overrides,
});

describe('ProgressCalculator', () => {
  it('should add tournament award XP to the total and persist it in the snapshot', async () => {
    const { results, progress, tournaments, calculator } = setup();
    await new RecordGameResultsUseCase(results, calculator, clock).execute('u1', [result('a')]);
    const gameXp = xpForGame(result('a'));
    expect(progress.snapshots.get('u1')?.xp).toBe(gameXp);

    tournaments.rows.set('u1', [championship()]);
    const view = await calculator.compute('u1', { persist: true });
    expect(view.progression.totalXp).toBe(gameXp + 450);
    expect(progress.snapshots.get('u1')?.xp).toBe(gameXp + 450);
    expect(view.newlyUnlocked).toEqual(expect.arrayContaining(['tournament-first', 'tournament-title']));
    expect(view.newlyUnlocked).not.toContain('first-game');
  });

  it('should not persist anything when only previewing', async () => {
    const { progress, tournaments, calculator } = setup();
    tournaments.rows.set('u1', [championship()]);
    const view = await calculator.compute('u1', { persist: false });
    expect(view.progression.totalXp).toBe(450);
    expect(view.newlyUnlocked).toEqual([]);
    expect(view.achievements.find((a) => a.definition.id === 'tournament-title')?.progress).toEqual({ current: 1, target: 1 });
    expect(progress.snapshots.size).toBe(0);
  });
});

describe('PlayerProgressRefresher', () => {
  it('should recompute every distinct player once, in bounded batches', async () => {
    const { progress, tournaments, calculator } = setup();
    tournaments.rows.set('u1', [championship()]);
    tournaments.rows.set('host', [championship({ wasHost: true, wasEntrant: false, finalRank: null, matchesPlayed: 0, awards: [] })]);
    let running = 0;
    let peak = 0;
    const computed: string[] = [];
    const tracked = {
      async compute(userId: string, options: { persist: boolean }) {
        running += 1;
        peak = Math.max(peak, running);
        computed.push(userId);
        try {
          return await calculator.compute(userId, options);
        } finally {
          running -= 1;
        }
      },
    };

    await new PlayerProgressRefresher(tracked, 2).refresh(['u1', 'host', 'u1', 'u2', 'u3']);
    expect(computed.sort()).toEqual(['host', 'u1', 'u2', 'u3']);
    expect(peak).toBeLessThanOrEqual(2);
    expect(progress.snapshots.get('u1')?.xp).toBe(450);
    expect((await progress.get('host')).unlocked.has('tournament-host-8')).toBe(true);
  });

  it('should refresh the others when one player fails and report the failure afterwards', async () => {
    const { progress, calculator } = setup();
    const flaky = {
      compute: (userId: string, options: { persist: boolean }) =>
        userId === 'broken' ? Promise.reject(new Error('db down')) : calculator.compute(userId, options),
    };
    await expect(new PlayerProgressRefresher(flaky).refresh(['broken', 'u1'])).rejects.toBeInstanceOf(AggregateError);
    expect(progress.snapshots.has('u1')).toBe(true);
  });
});

describe('SaveAccountDocumentUseCase', () => {
  const repo: IAccountDocumentRepository = {
    list: async () => [],
    save: async (_u, key, data, version) => ({ ok: true, document: { key, data, version: version + 1, updatedAt: NOW } as AccountDocument }),
  };

  it('should only accept known keys and objects', async () => {
    const useCase = new SaveAccountDocumentUseCase(repo);
    await expect(useCase.execute('u1', 'evil', { data: {}, version: 0 })).rejects.toMatchObject({ code: 'not_found' });
    await expect(useCase.execute('u1', 'game-settings', { data: [], version: 0 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', 'game-settings', { data: { a: 'x'.repeat(40_000) }, version: 0 })).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(useCase.execute('u1', 'game-settings', { data: { theme: 'dark' }, version: 0 })).resolves.toMatchObject({ ok: true });
  });

  it.each([-1, 1.5, '3', undefined])('should refuse %j as the version the client last saw', async (version) => {
    const useCase = new SaveAccountDocumentUseCase(repo);

    await expect(useCase.execute('u1', 'sound-settings', { data: {}, version })).rejects.toMatchObject({ code: 'invalid_input' });
  });
});

describe('custom sounds', () => {
  const wav = new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WAVE'].map((c) => c.charCodeAt(0))));

  it('should sniff audio formats from magic bytes', () => {
    expect(sniffAudioFormat(wav)?.extension).toBe('wav');
    expect(sniffAudioFormat(new Uint8Array([0x49, 0x44, 0x33, 4]))?.extension).toBe('mp3');
    expect(sniffAudioFormat(new Uint8Array([0x3c, 0x68, 0x74, 0x6d]))).toBeNull();
  });

  it('should store the blob and replace the previous one on re-upload', async () => {
    const rows = new Map<string, StoredCustomSound>();
    const deleted: string[] = [];
    let n = 0;
    const sounds: ICustomSoundRepository = {
      list: async () => [...rows.values()],
      count: async () => rows.size,
      upsert: async (_u, s) => void rows.set(s.id, s),
      updateMetadata: async () => true,
      remove: async () => null,
    };
    const storage: IAudioBlobStorage = {
      put: async (path) => ({ url: `https://blob/${path}?${++n}`, storageKey: `${path}#${n}` }),
      delete: async (keys) => void deleted.push(...keys),
    };
    const useCase = new UploadCustomSoundUseCase(sounds, storage, clock);
    const meta = { id: 'custom-1', name: 'Boom', duration: 1.2, category: 'meme', roles: { wizard: true } };

    const first = await useCase.execute('u1', meta, wav);
    expect(first.roles).toEqual({ wizard: true, jester: false, trick: false, afk: false, shared: false });
    await useCase.execute('u1', meta, wav);
    expect(deleted).toEqual([first.storageKey]);
    await expect(useCase.execute('u1', meta, new Uint8Array([1, 2, 3]))).rejects.toMatchObject({ code: 'invalid_input' });
  });

  const bytes = (...values: (number | string)[]) =>
    new Uint8Array(values.flatMap((value) => (typeof value === 'string' ? [...value].map((c) => c.charCodeAt(0)) : [value])));

  it.each([
    ['Ogg', bytes('OggS', 0), { contentType: 'audio/ogg', extension: 'ogg' }],
    ['an MP3 frame without ID3 tag', bytes(0xff, 0xfb, 0x90, 0x44), { contentType: 'audio/mpeg', extension: 'mp3' }],
    ['a RIFF file that is not WAVE', bytes('RIFF', 0, 0, 0, 0, 'AVI '), null],
    ['a truncated WAV header', bytes('RIFF', 0, 0, 0, 0, 'WAV'), null],
    ['a lone frame-sync byte', bytes(0xff), null],
  ])('should sniff %s', (_label, input, format) => {
    expect(sniffAudioFormat(input)).toEqual(format);
  });

  function soundStore(initial: StoredCustomSound[] = []) {
    const rows = new Map(initial.map((row) => [row.id, row]));
    const deleted: string[] = [];
    let uploads = 0;
    const sounds: ICustomSoundRepository = {
      list: async () => [...rows.values()],
      count: async () => rows.size,
      upsert: async (_u, sound) => void rows.set(sound.id, sound),
      updateMetadata: async (_u, id, changes) => {
        const row = rows.get(id);
        if (!row) return false;
        rows.set(id, { ...row, ...changes });
        return true;
      },
      remove: async (_u, id) => {
        const row = rows.get(id) ?? null;
        rows.delete(id);
        return row;
      },
    };
    const storage: IAudioBlobStorage = {
      put: async (path) => ({ url: `https://blob/${path}`, storageKey: `${path}#${++uploads}` }),
      delete: async (keys) => void deleted.push(...keys),
    };
    return { rows, deleted, sounds, storage };
  }

  const stored = (id: string, createdAt = NOW - 1000): StoredCustomSound => ({
    id, name: id, url: `https://blob/${id}`, storageKey: `key-${id}`, size: 10, duration: 1, category: 'meme',
    roles: { wizard: false, jester: false, trick: false, afk: false, shared: false }, createdAt,
  });
  const valid = { id: 'custom-1', name: 'Boom', duration: 1.2, category: 'meme', roles: {} };

  it.each([
    ['an id with a slash', { id: '../other-user' }],
    ['an id over 120 characters', { id: 'a'.repeat(121) }],
    ['a blank name', { name: '   ' }],
    ['a name over 60 characters', { name: 'x'.repeat(61) }],
    ['a clip under 0.1 s', { duration: 0.05 }],
    ['a clip over 10.5 s', { duration: 10.6 }],
    ['a duration given as text', { duration: '1.2' }],
    ['an unknown category', { category: 'horror' }],
    ['no roles', { roles: null }],
  ])('should refuse to upload a sound with %s', async (_label, change) => {
    const store = soundStore();
    const upload = new UploadCustomSoundUseCase(store.sounds, store.storage, clock);

    await expect(upload.execute('u1', { ...valid, ...change }, wav)).rejects.toMatchObject({ code: 'invalid_input' });
    expect(store.rows.size).toBe(0);
  });

  it('should accept a clip up to half a second over the 10 s limit and trim its name', async () => {
    const store = soundStore();
    const upload = new UploadCustomSoundUseCase(store.sounds, store.storage, clock);

    const sound = await upload.execute('u1', { ...valid, name: '  Boom  ', duration: 10.5 }, wav);

    expect(sound).toMatchObject({ name: 'Boom', duration: 10.5, size: wav.length, createdAt: NOW, url: 'https://blob/custom-sounds/u1/custom-1.wav' });
  });

  it.each([
    ['an empty file', new Uint8Array(0)],
    ['a file over 2 MB', new Uint8Array(CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES + 1).fill(0xff)],
  ])('should refuse %s', async (_label, file) => {
    const store = soundStore();

    await expect(new UploadCustomSoundUseCase(store.sounds, store.storage, clock).execute('u1', valid, file)).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('should stop new sounds at the quota but still let a full account replace one', async () => {
    const full = Array.from({ length: ACCOUNT_LIMITS.MAX_CUSTOM_SOUNDS }, (_, i) => stored(`s${i}`));
    const store = soundStore(full);
    const upload = new UploadCustomSoundUseCase(store.sounds, store.storage, clock);

    await expect(upload.execute('u1', { ...valid, id: 'one-more' }, wav)).rejects.toMatchObject({ code: 'quota_exceeded' });
    const replaced = await upload.execute('u1', { ...valid, id: 's3' }, wav);

    expect(replaced.createdAt).toBe(NOW - 1000);
    expect(store.deleted).toEqual(['key-s3']);
    expect(store.rows.size).toBe(ACCOUNT_LIMITS.MAX_CUSTOM_SOUNDS);
  });

  it('should rename, recategorize and reassign a sound but keep its clip', async () => {
    const store = soundStore([stored('s1')]);
    const update = new UpdateCustomSoundUseCase(store.sounds);

    await update.execute('u1', 's1', { name: ' Fanfare ', category: 'brass', roles: { trick: true, shared: 'yes' } });

    expect(store.rows.get('s1')).toMatchObject({
      name: 'Fanfare',
      category: 'brass',
      roles: { wizard: false, jester: false, trick: true, afk: false, shared: false },
      duration: 1,
      storageKey: 'key-s1',
    });
    await expect(update.execute('u1', 'missing', { name: 'X', category: 'brass', roles: {} })).rejects.toMatchObject({ code: 'not_found' });
    await expect(update.execute('u1', 's1', { name: '', category: 'brass', roles: {} })).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('should delete the stored clip with the sound, and do nothing for a missing sound', async () => {
    const store = soundStore([stored('s1')]);
    const remove = new DeleteCustomSoundUseCase(store.sounds, store.storage);

    await remove.execute('u1', 's1');
    await remove.execute('u1', 's1');

    expect(store.rows.size).toBe(0);
    expect(store.deleted).toEqual(['key-s1']);
  });
});
