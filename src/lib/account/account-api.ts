import type {
  AccountOverview,
  AccountDocumentKey,
  CharacterView,
  GameHistoryPage,
  PinGameOutput,
  RecordGameResultsOutput,
} from '@shared/application/use-cases/account';
import type { AccountDocument, ScoredGameResult, StoredCustomSound } from '@shared/application/ports/account';
import type { AchievementCategory, GameResult, PlayerProfile, PlayerStatsSummary, ProfileChanges } from '@shared/domain/account';

import type { CharacterAppearance } from '@shared/domain/character';

import type { DeploymentCapabilities } from '@/infrastructure/auth/auth-capabilities';

/** JSON shape of the overview: Maps and functions do not survive serialization. */
export type AccountOverviewDto = Omit<AccountOverview, 'achievements'> & {
  achievements: {
    definition: { id: string; name: string; description: string; icon: string; tier: string; category: AchievementCategory; secret?: boolean };
    progress: { current: number; target: number };
    unlockedAt: number | null;
  }[];
};

/** One game of the player's history as the API returns it. */
export type AccountGameDto = ScoredGameResult;
export type GameHistoryPageDto = GameHistoryPage;

export class AccountApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body?: unknown
  ) {
    super(message);
    this.name = 'AccountApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new AccountApiError(response.status, error?.code ?? 'http_error', error?.message ?? response.statusText, body);
  }
  return body as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Typed client of /api/account. The only module that knows the HTTP routes. */
export const accountApi = {
  capabilities: () => request<DeploymentCapabilities>('/api/account/capabilities'),
  overview: () => request<AccountOverviewDto>('/api/account'),
  /** The signed-in player's look, whether it was saved, and the parts they may wear. */
  character: () => request<CharacterView>('/api/account/character'),
  /** Saves a look; a refused one answers 422 with the reason (AppearanceError) as the message. */
  saveCharacter: (appearance: CharacterAppearance) => request<CharacterView>('/api/account/character', json('PUT', { appearance })),
  updateProfile: (changes: ProfileChanges) =>
    request<{ profile: PlayerProfile }>('/api/account', json('PATCH', changes)),
  recordGames: (results: GameResult[]) => request<RecordGameResultsOutput>('/api/account/games', json('POST', { results })),
  /** Newest first; pass the previous page's `nextCursor` to continue. The first page includes `pinned`. */
  gameHistory: (options: { cursor?: string | null; limit?: number } = {}) => {
    const params = new URLSearchParams();
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    const query = params.toString();
    return request<GameHistoryPageDto>(`/api/account/games${query ? `?${query}` : ''}`);
  },
  pinGame: (clientGameId: string) =>
    request<PinGameOutput>(`/api/account/games/${encodeURIComponent(clientGameId)}/pin`, { method: 'PUT' }),
  unpinGame: (clientGameId: string) =>
    request<void>(`/api/account/games/${encodeURIComponent(clientGameId)}/pin`, { method: 'DELETE' }),
  importGuest: (stats: PlayerStatsSummary, history: GameResult[]) =>
    request<AccountOverviewDto>('/api/account/import', json('POST', { stats, history })),
  documents: () => request<{ documents: AccountDocument[] }>('/api/account/documents'),
  saveDocument: (key: AccountDocumentKey, data: unknown, version: number) =>
    request<{ document: AccountDocument }>(`/api/account/documents/${key}`, json('PUT', { data, version })),
  sounds: () => request<{ sounds: StoredCustomSound[] }>('/api/account/sounds'),
  uploadSound: (file: Blob, metadata: Record<string, unknown>) => {
    const form = new FormData();
    form.set('file', file);
    form.set('metadata', JSON.stringify(metadata));
    return request<{ sound: StoredCustomSound }>('/api/account/sounds', { method: 'POST', body: form });
  },
  updateSound: (id: string, metadata: Record<string, unknown>) =>
    request<void>(`/api/account/sounds/${encodeURIComponent(id)}`, json('PATCH', metadata)),
  deleteSound: (id: string) => request<void>(`/api/account/sounds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  exportUrl: '/api/account/export',
};
