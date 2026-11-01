import type {
  ChampionView,
  CreateTournamentInput,
  InviteToTournamentResult,
  MatchTicketView,
  MyTournamentsView,
  TournamentDetailView,
  TournamentListPage,
} from '@shared/application/use-cases/tournament';
import type { TournamentListStatus } from '@shared/application/ports/tournament';

import { AccountApiError } from '@/lib/account/account-api';

/** First page of a list: the page plus the recent champions strip. */
export type TournamentListResponse = TournamentListPage & { recentChampions?: ChampionView[] };

export interface TournamentListQuery {
  status: TournamentListStatus;
  cursor?: string | null;
  limit?: number;
}

/** Create body: the draft fields plus whether the host plays (see CreateTournamentInput). */
export type TournamentDraftInput = CreateTournamentInput;

/** PATCH body: only the fields present change; `description: null` and `startsAt: null` clear. */
export type TournamentChangesInput = Partial<TournamentDraftInput>;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new AccountApiError(response.status, error?.code ?? 'http_error', error?.message ?? response.statusText, body);
  }
  return body as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const id = (value: string) => encodeURIComponent(value);

function query(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** Typed client of /api/tournaments. The only browser module that knows these routes. */
export const tournamentApi = {
  list: ({ status, cursor, limit }: TournamentListQuery, signal?: AbortSignal) =>
    request<TournamentListResponse>(`/api/tournaments${query({ status, cursor, limit })}`, { signal }),
  mine: (signal?: AbortSignal) => request<MyTournamentsView>('/api/tournaments/me', { signal }),
  /** `code`: the invite code of a private tournament (from its share link). */
  get: (tournamentId: string, code?: string | null, signal?: AbortSignal) =>
    request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}${query({ code })}`, { signal }),
  create: (input: TournamentDraftInput) => request<TournamentDetailView>('/api/tournaments', json('POST', input)),
  update: (tournamentId: string, changes: TournamentChangesInput) =>
    request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}`, json('PATCH', changes)),
  start: (tournamentId: string) => request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}/start`, json('POST')),
  cancel: (tournamentId: string) => request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}/cancel`, json('POST')),
  register: (tournamentId: string, inviteCode?: string | null) =>
    request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}/registration`, json('POST', inviteCode ? { inviteCode } : {})),
  withdraw: (tournamentId: string) =>
    request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}/registration`, { method: 'DELETE' }),
  ticket: (tournamentId: string) => request<MatchTicketView>(`/api/tournaments/${id(tournamentId)}/ticket`, json('POST')),
  resolveMatch: (tournamentId: string, matchId: string) =>
    request<TournamentDetailView>(`/api/tournaments/${id(tournamentId)}/matches/${id(matchId)}/resolve`, json('POST')),
  invite: (tournamentId: string, userIds: string[]) =>
    request<InviteToTournamentResult>(`/api/tournaments/${id(tournamentId)}/invites`, json('POST', { userIds })),
};
