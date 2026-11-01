import type { FriendsOverview, RoomPlayerAccount, SendFriendRequestOutcome, SocialPulse } from '@shared/application/use-cases/friends';
import type { InboxActionResult, InboxPage } from '@shared/application/use-cases/inbox';
import type { PlayerSearchResult, PresenceActivity, SocialPlayer, SocialSettings, SocialSettingsChanges } from '@shared/domain/social';

import type { SentInvitesResponse } from '@/app/api/types/social-invites.types';
import { AccountApiError } from '@/lib/account/account-api';

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

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const id = (value: string) => encodeURIComponent(value);

/** Typed client of /api/social and /api/inbox. The only module that knows these routes. */
export const socialApi = {
  /** `seatProof`: the secret reconnect id of the current room, so the game worker can vouch for the seat. */
  pulse: (activity: PresenceActivity, idle: boolean, seatProof?: string) =>
    request<SocialPulse>('/api/social/pulse', json('POST', { activity: { kind: activity.kind, roomCode: 'roomCode' in activity ? activity.roomCode : undefined }, idle, seatProof })),
  friends: () => request<FriendsOverview>('/api/social/friends'),
  sendFriendRequest: (target: { username: string } | { userId: string }) =>
    request<{ outcome: SendFriendRequestOutcome }>('/api/social/friends', json('POST', target)),
  respondToRequest: (userId: string, accept: boolean) => request<void>(`/api/social/requests/${id(userId)}`, json('PUT', { accept })),
  cancelRequest: (userId: string) => request<void>(`/api/social/requests/${id(userId)}`, { method: 'DELETE' }),
  removeFriend: (userId: string) => request<void>(`/api/social/friends/${id(userId)}`, { method: 'DELETE' }),
  setPinned: (userId: string, pinned: boolean) => request<void>(`/api/social/friends/${id(userId)}/pin`, { method: pinned ? 'PUT' : 'DELETE' }),
  blocked: () => request<{ players: SocialPlayer[] }>('/api/social/blocks'),
  block: (userId: string) => request<void>(`/api/social/blocks/${id(userId)}`, { method: 'PUT' }),
  unblock: (userId: string) => request<void>(`/api/social/blocks/${id(userId)}`, { method: 'DELETE' }),
  invite: (userId: string, roomCode: string) => request<void>('/api/social/invites', json('POST', { userId, roomCode })),
  /** Invites the player sent to this room, newest first. */
  sentInvites: (roomCode: string) => request<SentInvitesResponse>(`/api/social/invites?room=${encodeURIComponent(roomCode)}`),
  revokeInvite: (inviteId: string) => request<void>(`/api/social/invites/${id(inviteId)}`, { method: 'DELETE' }),
  search: (query: string, signal?: AbortSignal) =>
    request<{ players: PlayerSearchResult[] }>(`/api/social/search?q=${encodeURIComponent(query)}`, { signal }),
  player: (username: string) => request<{ player: PlayerSearchResult }>(`/api/social/players/${id(username)}`),
  roomAccounts: (roomCode: string) => request<{ seats: RoomPlayerAccount[] }>(`/api/social/rooms/${id(roomCode)}/accounts`),
  settings: () => request<SocialSettings>('/api/social/settings'),
  updateSettings: (changes: SocialSettingsChanges) => request<SocialSettings>('/api/social/settings', json('PATCH', changes)),
  inbox: (cursor?: string | null) => request<InboxPage>(`/api/inbox${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  markRead: (target: { ids: string[] } | { all: true }) => request<{ updated: number }>('/api/inbox/read', json('POST', target)),
  dismiss: (itemId: string) => request<void>(`/api/inbox/${id(itemId)}`, { method: 'DELETE' }),
  act: (itemId: string, action: 'accept' | 'decline') => request<InboxActionResult>(`/api/inbox/${id(itemId)}/actions`, json('POST', { action })),
};
