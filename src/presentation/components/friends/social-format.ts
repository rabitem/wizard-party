import type { FriendPresence, PresenceMode, PresenceStatus } from '@shared/domain/social';

/** Status colours, shared by dots, rings and pickers. */
export const STATUS_COLORS: Record<PresenceStatus, string> = {
  online: '#34d399',
  away: '#fbbf24',
  busy: '#f87171',
  offline: '#78716c',
};

export const MODE_LABELS: Record<PresenceMode, { label: string; description: string }> = {
  online: { label: 'Online', description: 'Friends see you and can invite you.' },
  away: { label: 'Away', description: 'Shown as away; invites still arrive.' },
  busy: { label: 'Do not disturb', description: 'No pop-ups. Invites wait in your inbox.' },
  invisible: { label: 'Invisible', description: 'Appear offline while you play.' },
};

export const MODE_COLORS: Record<PresenceMode, string> = {
  online: STATUS_COLORS.online,
  away: STATUS_COLORS.away,
  busy: STATUS_COLORS.busy,
  invisible: STATUS_COLORS.offline,
};

export function presenceLabel(presence: FriendPresence): string {
  if (presence.status === 'offline') return 'Offline';
  if (presence.activity === 'lobby') return 'In a lobby';
  if (presence.activity === 'game') return 'In a game';
  if (presence.status === 'away') return 'Away';
  if (presence.status === 'busy') return 'Do not disturb';
  return 'Online';
}

/** "2 min ago" style age for inbox items. */
export function timeAgo(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}
