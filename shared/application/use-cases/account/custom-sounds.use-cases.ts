import { ACCOUNT_LIMITS } from '../../../domain/account';
import {
  CUSTOM_AUDIO_MAX_DURATION_SECONDS,
  CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES,
  CUSTOM_AUDIO_MIN_DURATION_SECONDS,
  SOUND_CATEGORY_IDS,
  type CustomSoundAssignments,
  type SoundCategory,
} from '../../../domain/constants/sound-options';
import type { IAudioBlobStorage, IClock, ICustomSoundRepository, StoredCustomSound } from '../../ports/account';
import { AccountError } from './account-error';

const SOUND_ID = /^[A-Za-z0-9_.-]{1,120}$/;
const MAX_NAME_LENGTH = 60;
const ROLE_KEYS: (keyof CustomSoundAssignments)[] = ['wizard', 'jester', 'trick', 'afk', 'shared'];

type AudioFormat = { contentType: string; extension: string };

/** Detects the format from magic bytes instead of trusting the declared content type. */
export function sniffAudioFormat(bytes: Uint8Array): AudioFormat | null {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WAVE') return { contentType: 'audio/wav', extension: 'wav' };
  if (bytes.length >= 4 && ascii(0, 4) === 'OggS') return { contentType: 'audio/ogg', extension: 'ogg' };
  if (bytes.length >= 3 && ascii(0, 3) === 'ID3') return { contentType: 'audio/mpeg', extension: 'mp3' };
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return { contentType: 'audio/mpeg', extension: 'mp3' };
  return null;
}

export interface CustomSoundMetadataInput {
  id?: unknown;
  name?: unknown;
  duration?: unknown;
  category?: unknown;
  roles?: unknown;
}

function parseMetadata(input: CustomSoundMetadataInput) {
  const { id, name, duration, category, roles } = input;
  if (typeof id !== 'string' || !SOUND_ID.test(id)) throw new AccountError('invalid_input', 'invalid sound id');
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new AccountError('invalid_input', 'invalid sound name');
  }
  if (
    typeof duration !== 'number' ||
    !(duration >= CUSTOM_AUDIO_MIN_DURATION_SECONDS && duration <= CUSTOM_AUDIO_MAX_DURATION_SECONDS + 0.5)
  ) {
    throw new AccountError('invalid_input', 'invalid duration');
  }
  if (typeof category !== 'string' || !(SOUND_CATEGORY_IDS as readonly string[]).includes(category)) {
    throw new AccountError('invalid_input', 'invalid category');
  }
  if (typeof roles !== 'object' || roles === null) throw new AccountError('invalid_input', 'invalid roles');
  const parsedRoles = Object.fromEntries(
    ROLE_KEYS.map((key) => [key, (roles as Record<string, unknown>)[key] === true])
  ) as unknown as CustomSoundAssignments;
  return { id, name: name.trim(), duration, category: category as SoundCategory, roles: parsedRoles };
}

export class ListCustomSoundsUseCase {
  constructor(private readonly sounds: ICustomSoundRepository) {}

  execute(userId: string): Promise<StoredCustomSound[]> {
    return this.sounds.list(userId);
  }
}

export class UploadCustomSoundUseCase {
  constructor(
    private readonly sounds: ICustomSoundRepository,
    private readonly storage: IAudioBlobStorage,
    private readonly clock: IClock
  ) {}

  async execute(userId: string, metadata: CustomSoundMetadataInput, bytes: Uint8Array): Promise<StoredCustomSound> {
    const meta = parseMetadata(metadata);
    if (bytes.length === 0 || bytes.length > CUSTOM_AUDIO_MAX_FILE_SIZE_BYTES) {
      throw new AccountError('invalid_input', 'file size out of range');
    }
    const format = sniffAudioFormat(bytes);
    if (!format) throw new AccountError('invalid_input', 'unsupported audio format');

    const existing = (await this.sounds.list(userId)).find((sound) => sound.id === meta.id);
    if (!existing && (await this.sounds.count(userId)) >= ACCOUNT_LIMITS.MAX_CUSTOM_SOUNDS) {
      throw new AccountError('quota_exceeded', `at most ${ACCOUNT_LIMITS.MAX_CUSTOM_SOUNDS} sounds per account`);
    }

    const blob = await this.storage.put(`custom-sounds/${userId}/${meta.id}.${format.extension}`, bytes, format.contentType);
    const stored: StoredCustomSound = {
      ...meta,
      url: blob.url,
      storageKey: blob.storageKey,
      size: bytes.length,
      createdAt: existing?.createdAt ?? this.clock.now(),
    };
    await this.sounds.upsert(userId, stored);
    if (existing && existing.storageKey !== stored.storageKey) await this.storage.delete([existing.storageKey]);
    return stored;
  }
}

export class UpdateCustomSoundUseCase {
  constructor(private readonly sounds: ICustomSoundRepository) {}

  async execute(userId: string, id: string, input: CustomSoundMetadataInput): Promise<void> {
    // Duration is immutable; reuse a valid placeholder so the shared parser can be applied.
    const meta = parseMetadata({ ...input, id, duration: CUSTOM_AUDIO_MIN_DURATION_SECONDS });
    const updated = await this.sounds.updateMetadata(userId, id, { name: meta.name, category: meta.category, roles: meta.roles });
    if (!updated) throw new AccountError('not_found', 'sound not found');
  }
}

export class DeleteCustomSoundUseCase {
  constructor(
    private readonly sounds: ICustomSoundRepository,
    private readonly storage: IAudioBlobStorage
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    const removed = await this.sounds.remove(userId, id);
    if (removed) await this.storage.delete([removed.storageKey]);
  }
}
