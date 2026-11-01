import { ACCOUNT_LIMITS } from '../../../domain/account';
import type { AccountDocument, IAccountDocumentRepository, SaveDocumentResult } from '../../ports/account';
import { AccountError } from './account-error';

/**
 * Settings documents an account can sync. The server stores them as opaque JSON; each client
 * slice owns normalization of its own document. Adding a synced setting = adding a key here
 * plus a client slice.
 */
export const ACCOUNT_DOCUMENT_KEYS = ['game-settings', 'sound-settings', 'soundboard'] as const;
export type AccountDocumentKey = (typeof ACCOUNT_DOCUMENT_KEYS)[number];

export function isAccountDocumentKey(value: string): value is AccountDocumentKey {
  return (ACCOUNT_DOCUMENT_KEYS as readonly string[]).includes(value);
}

export class ListAccountDocumentsUseCase {
  constructor(private readonly documents: IAccountDocumentRepository) {}

  execute(userId: string): Promise<AccountDocument[]> {
    return this.documents.list(userId);
  }
}

export class SaveAccountDocumentUseCase {
  constructor(private readonly documents: IAccountDocumentRepository) {}

  async execute(userId: string, key: string, input: { data?: unknown; version?: unknown }): Promise<SaveDocumentResult> {
    if (!isAccountDocumentKey(key)) throw new AccountError('not_found', `unknown document ${key}`);
    const { data, version } = input;
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new AccountError('invalid_input', 'data must be an object');
    }
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
      throw new AccountError('invalid_input', 'version must be a non-negative integer');
    }
    if (new TextEncoder().encode(JSON.stringify(data)).length > ACCOUNT_LIMITS.MAX_DOCUMENT_BYTES) {
      throw new AccountError('invalid_input', 'document too large');
    }
    return this.documents.save(userId, key, data, version);
  }
}
