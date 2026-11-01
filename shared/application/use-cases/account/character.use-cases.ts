import { isComplete } from '../../../domain/account';
import {
  appearanceForLegacyAvatar,
  parseAppearance,
  repairAppearance,
  unlockedCharacterParts,
  validateAppearance,
  type CharacterAppearance,
  type CharacterUnlockContext,
} from '../../../domain/character';
import type { IAccountDocumentRepository, ICharacterRepository } from '../../ports/account';
import { AccountError } from './account-error';
import type { ProgressCalculator } from './progress-calculator';
import type { AccountIdentity, EnsureProfileUseCase } from './profile.use-cases';

export interface CharacterView {
  appearance: CharacterAppearance;
  /** False while the look is derived from the avatar chosen before characters existed. */
  saved: boolean;
  /** Every part id the player may wear now, in catalog order. */
  unlockedPartIds: string[];
}

/** Level and achievements from the full history; an achievement once unlocked stays unlocked. */
async function unlockContext(calculator: ProgressCalculator, userId: string): Promise<CharacterUnlockContext> {
  const progress = await calculator.compute(userId, { persist: false });
  const achievementIds = progress.achievements
    .filter((status) => status.unlockedAt !== null || isComplete(status.progress))
    .map((status) => status.definition.id);
  return { level: progress.progression.level, achievementIds: new Set(achievementIds) };
}

const view = (appearance: CharacterAppearance, saved: boolean, context: CharacterUnlockContext): CharacterView => ({
  appearance,
  saved,
  unlockedPartIds: unlockedCharacterParts(context).map((part) => part.id),
});

/** The avatar id in the synced game-settings document, which characters replace. */
async function legacyAvatarId(documents: IAccountDocumentRepository, userId: string): Promise<string | null> {
  const settings = (await documents.list(userId)).find((document) => document.key === 'game-settings');
  const avatar = (settings?.data as { avatar?: unknown } | null | undefined)?.avatar;
  return typeof avatar === 'string' ? avatar : null;
}

export class GetCharacterUseCase {
  constructor(
    private readonly characters: ICharacterRepository,
    private readonly documents: IAccountDocumentRepository,
    private readonly calculator: ProgressCalculator
  ) {}

  async execute(identity: AccountIdentity): Promise<CharacterView> {
    const [stored, context] = await Promise.all([
      this.characters.get(identity.userId),
      unlockContext(this.calculator, identity.userId),
    ]);
    const saved = parseAppearance(stored);
    if (saved) return view(repairAppearance(saved, context), true, context);
    return view(appearanceForLegacyAvatar(await legacyAvatarId(this.documents, identity.userId)), false, context);
  }
}

export class SaveCharacterUseCase {
  constructor(
    private readonly ensureProfile: EnsureProfileUseCase,
    private readonly characters: ICharacterRepository,
    private readonly calculator: ProgressCalculator
  ) {}

  /** `input` is the request body: `{ appearance }`. Error messages are AppearanceError codes. */
  async execute(identity: AccountIdentity, input: unknown): Promise<CharacterView> {
    const appearance = parseAppearance((input as { appearance?: unknown } | null)?.appearance);
    if (!appearance) throw new AccountError('invalid_input', 'appearance_shape');
    const context = await unlockContext(this.calculator, identity.userId);
    const error = validateAppearance(appearance, context);
    if (error) throw new AccountError('invalid_input', error);
    await this.ensureProfile.execute(identity);
    await this.characters.save(identity.userId, appearance);
    return view(appearance, true, context);
  }
}
