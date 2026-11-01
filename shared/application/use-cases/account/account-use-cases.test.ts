import { describe, expect, it } from 'vitest';

import { xpForGame } from '../../../domain/account';
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
});
