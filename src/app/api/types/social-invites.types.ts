import type { SentGameInvite } from '@shared/application/use-cases/friends';
import type { CharacterAppearance } from '@shared/domain/character';
import type { SentInviteState } from '@shared/domain/social';

/** One invite the signed-in player sent, as `GET /api/social/invites?room=<roomCode>` returns it. */
export interface SentInviteDto {
  id: string;
  recipient: { userId: string; displayName: string; avatarId: string | null; appearance: CharacterAppearance };
  /** ISO 8601. */
  createdAt: string;
  readAt: string | null;
  expiresAt: string;
  state: SentInviteState;
}

export interface SentInvitesResponse {
  invites: SentInviteDto[];
}

const iso = (ms: number) => new Date(ms).toISOString();

export function toSentInviteDto(invite: SentGameInvite): SentInviteDto {
  return {
    id: invite.id,
    recipient: { userId: invite.recipient.userId, displayName: invite.recipient.displayName, avatarId: invite.recipient.avatar, appearance: invite.recipient.appearance },
    createdAt: iso(invite.createdAt),
    readAt: invite.readAt === null ? null : iso(invite.readAt),
    expiresAt: iso(invite.expiresAt),
    state: invite.state,
  };
}
