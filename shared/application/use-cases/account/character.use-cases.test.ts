import { describe, expect, it } from 'vitest';

import { getProgression } from '../../../domain/account';
import { CHARACTER_SET_LEVELS, DEFAULT_APPEARANCE, type CharacterAppearance } from '../../../domain/character';
import type { AccountDocument, IAccountDocumentRepository } from '../../ports/account';
import { MemoryCharacters, MemoryGameResults, MemoryProfiles, MemoryProgress, MemoryTournamentHistory } from './account-test-fakes';
import { GetCharacterUseCase, SaveCharacterUseCase } from './character.use-cases';
import { EnsureProfileUseCase } from './profile.use-cases';
import { ProgressCalculator } from './progress-calculator';

const NOW = 1_800_000_000_000;
const clock = { now: () => NOW };
const identity = { userId: 'u1' };
const KNIGHT_XP = 1_000_000;

function setup(settings?: Record<string, unknown>) {
  const results = new MemoryGameResults();
  const progress = new MemoryProgress(clock);
  const characters = new MemoryCharacters();
  const documents: IAccountDocumentRepository = {
    list: async () => (settings ? [{ key: 'game-settings', data: settings, version: 1, updatedAt: NOW } satisfies AccountDocument] : []),
    save: async () => ({ ok: false, reason: 'conflict', current: null }),
  };
  const calculator = new ProgressCalculator(results, progress, new MemoryTournamentHistory(), clock);
  const ensure = new EnsureProfileUseCase(new MemoryProfiles(), clock);
  const earnXp = (xp: number) => results.insertMany('u1', [{ clientGameId: 'game-u1-00000001', playedAt: NOW - 1000, playerCount: 4, placement: 2, score: 30, rounds: [], xp }]);
  return {
    get: new GetCharacterUseCase(characters, documents, calculator),
    save: new SaveCharacterUseCase(ensure, characters, calculator),
    characters,
    progress,
    earnXp,
  };
}

const knight: CharacterAppearance = { ...DEFAULT_APPEARANCE, head: 'head:knight', outfit: 'outfit:knight' };

describe('GetCharacterUseCase', () => {
  it('should derive a first look from the avatar chosen before characters, with only starter parts unlocked', async () => {
    const { get } = setup({ avatar: 'skull', theme: 'dark' });
    const character = await get.execute(identity);

    expect(character.saved).toBe(false);
    expect(character.appearance).toMatchObject({ head: 'head:rogue', palette: 'palette:shadow' });
    expect(character.unlockedPartIds).toContain('head:mage');
    expect(character.unlockedPartIds).not.toContain('head:knight');
  });

  it('should return the default look without any synced settings', async () => {
    expect((await setup().get.execute(identity)).appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it('should repair a stored look whose parts no longer exist, keeping the rest', async () => {
    const { get, characters } = setup();
    characters.rows.set('u1', { ...DEFAULT_APPEARANCE, head: 'head:retired', palette: 'palette:forest' });

    const character = await get.execute(identity);
    expect(character).toMatchObject({ saved: true, appearance: { ...DEFAULT_APPEARANCE, palette: 'palette:forest' } });
  });
});

describe('SaveCharacterUseCase', () => {
  it('should refuse parts the player has not unlocked, and save them once they have', async () => {
    const { get, save, earnXp } = setup();
    await expect(save.execute(identity, { appearance: knight })).rejects.toMatchObject({ code: 'invalid_input', message: 'locked_part' });

    expect(getProgression(KNIGHT_XP).level).toBeGreaterThanOrEqual(CHARACTER_SET_LEVELS.knight);
    await earnXp(KNIGHT_XP);
    expect(await save.execute(identity, { appearance: knight })).toMatchObject({ saved: true, appearance: knight });
    expect((await get.execute(identity)).appearance).toEqual(knight);
  });

  it('should unlock achievement parts from achievements the player holds', async () => {
    const { save, progress } = setup();
    const champion = { ...DEFAULT_APPEARANCE, offHand: 'off:badge-shield' };
    await expect(save.execute(identity, { appearance: champion })).rejects.toMatchObject({ message: 'locked_part' });

    await progress.unlock('u1', ['wins-10'], NOW - 500);
    expect((await save.execute(identity, { appearance: champion })).appearance).toEqual(champion);
  });

  it.each([
    ['a body without an appearance', {}, 'appearance_shape'],
    ['an appearance of another version', { appearance: { ...DEFAULT_APPEARANCE, v: 2 } }, 'appearance_shape'],
    ['a staff before its level, even though the rest of the look is valid', { appearance: { ...DEFAULT_APPEARANCE, mainHand: 'main:staff', offHand: 'off:none' } }, 'locked_part'],
  ])('should reject %s', async (_, body, message) => {
    await expect(setup().save.execute(identity, body)).rejects.toMatchObject({ code: 'invalid_input', message });
  });
});
