'use client';

import type { ReactNode } from 'react';
import { Flag, Swords, Trophy, UserCheck, UserPlus } from 'lucide-react';

import type { InboxItem, InboxKind, TournamentFinishedPayload } from '@shared/domain/social';
import { getTournamentAward } from '@shared/domain/tournament';

import { ordinal } from '../account/public/public-profile-format';
import { InviteRoomOccupancy } from './InviteRoomOccupancy';

/**
 * How each inbox kind is shown. A new kind only adds an entry here (plus its domain definition);
 * the inbox list, toasts, actions and read state are generic.
 */
export interface InboxRenderer<K extends InboxKind = InboxKind> {
  icon: ReactNode;
  /** One line, the actor's name already included. */
  title: (item: Extract<InboxItem, { kind: K }>) => string;
  detail?: (item: Extract<InboxItem, { kind: K }>) => string;
  /** Live state next to the detail; `actionable` is false once the item can't be acted on. */
  live?: (item: Extract<InboxItem, { kind: K }>, actionable: boolean) => ReactNode;
  acceptLabel?: string;
  declineLabel?: string;
}

const actorName = (item: InboxItem) => item.actor?.displayName ?? 'A former player';

/** "Champion, Oracle" from award ids; unknown ids (newer server) are skipped. */
function awardNames(awardIds: readonly string[]): string {
  return awardIds.map((id) => getTournamentAward(id)?.name).filter((name): name is string => !!name).join(', ');
}

function finishedTitle({ name, rank }: TournamentFinishedPayload): string {
  if (rank === null) return `${name} has finished`;
  if (rank === 1) return `You won ${name}!`;
  return `You finished ${ordinal(rank)} in ${name}`;
}

function finishedDetail({ rank, entrants, awards }: TournamentFinishedPayload): string {
  const field = rank === null ? `${entrants} players` : `of ${entrants} players`;
  const earned = awardNames(awards);
  return earned ? `${field} · ${earned}` : field;
}

export const INBOX_RENDERERS: { [K in InboxKind]: InboxRenderer<K> } = {
  friend_request: {
    icon: <UserPlus className="w-4 h-4" />,
    title: (item) => `${actorName(item)} sent you a friend request`,
    acceptLabel: 'Accept',
    declineLabel: 'Decline',
  },
  friend_accepted: {
    icon: <UserCheck className="w-4 h-4" />,
    title: (item) => `${actorName(item)} accepted your friend request`,
  },
  game_invite: {
    icon: <Swords className="w-4 h-4" />,
    title: (item) => `${actorName(item)} invited you to a game`,
    detail: (item) => `Room ${item.payload.roomCode}`,
    live: (item, actionable) => (actionable ? <InviteRoomOccupancy roomCode={item.payload.roomCode} /> : null),
    acceptLabel: 'Join',
    declineLabel: 'Not now',
  },
  tournament_table_ready: {
    icon: <Flag className="w-4 h-4" />,
    title: (item) => `Your table in ${item.payload.name} is ready`,
    detail: (item) => item.payload.roundLabel,
    acceptLabel: 'Join table',
  },
  tournament_finished: {
    icon: <Trophy className="w-4 h-4" />,
    title: (item) => finishedTitle(item.payload),
    detail: (item) => finishedDetail(item.payload),
  },
  tournament_invite: {
    icon: <Trophy className="w-4 h-4" />,
    title: (item) => `${actorName(item)} invited you to the tournament ${item.payload.name}`,
    detail: (item) => (item.payload.inviteCode ? 'Private tournament' : 'Open tournament'),
    acceptLabel: 'Register',
    declineLabel: 'Not now',
  },
};

export function rendererFor(item: InboxItem): InboxRenderer {
  return INBOX_RENDERERS[item.kind] as unknown as InboxRenderer;
}
