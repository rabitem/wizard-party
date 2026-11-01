'use client';

import { useMemo, useState } from 'react';
import { Check, Send, UserPlus, X } from 'lucide-react';

import type { InviteToTournamentResult } from '@shared/application/use-cases/tournament';
import { TOURNAMENT_LIMITS } from '@shared/domain/tournament';

import { useSocial, useSocialPanel } from '@/presentation/providers/SocialProvider';

import { PlayerAvatar } from '../account/PlayerAvatar';
import { Button, Notice, SERIF } from '../account/ui';
import { Modal } from '../room-browser/Modal';
import { inviteButtonLabel, inviteCandidates, inviteSummary, toggleInvite, type InviteSummary } from './tournament-detail-model';

function noCandidatesCopy(enabled: boolean, hasFriends: boolean): string {
  if (!enabled) return 'Friends are not available right now.';
  return hasFriends ? 'All your friends are already registered.' : 'You have no friends to invite yet.';
}

function NoCandidates({ enabled, hasFriends, onFindPlayers }: { enabled: boolean; hasFriends: boolean; onFindPlayers: () => void }) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-sm text-amber-200/55">{noCandidatesCopy(enabled, hasFriends)}</p>
      {enabled ? (
        <Button onClick={onFindPlayers} icon={<UserPlus className="h-4 w-4" />}>
          Find players
        </Button>
      ) : null}
    </div>
  );
}

export interface InviteFriendsDialogProps {
  /** Players already registered (they can't be invited). */
  entrantIds: ReadonlySet<string>;
  sending: boolean;
  onInvite: (userIds: string[]) => Promise<InviteToTournamentResult | null>;
  onClose: () => void;
}

/** Host tool: pick friends and send them a tournament invite to their inbox. */
export function InviteFriendsDialog({ entrantIds, sending, onInvite, onClose }: InviteFriendsDialogProps) {
  const { enabled, friends } = useSocial();
  const { open: openSocial } = useSocialPanel();
  const candidates = useMemo(() => inviteCandidates(friends, entrantIds), [friends, entrantIds]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [summary, setSummary] = useState<InviteSummary | null>(null);
  const names = useMemo(() => new Map(friends.map((friend) => [friend.userId, friend.displayName])), [friends]);
  const limitReached = selected.size >= TOURNAMENT_LIMITS.MAX_INVITES_PER_REQUEST;

  const send = async () => {
    const result = await onInvite([...selected]);
    if (!result) return;
    setSummary(inviteSummary(result, (userId) => names.get(userId) ?? 'A player'));
    setSelected(new Set());
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-amber-700/30 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-600/40 bg-amber-900/20">
            <UserPlus className="h-5 w-5 text-amber-500/80" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg text-amber-100/95" style={SERIF}>
              Invite friends
            </h2>
            <p className="text-xs text-amber-500/60" style={SERIF}>
              They get an invite in their inbox with a link to register.
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-amber-900/30 cursor-pointer" aria-label="Close">
          <X className="h-5 w-5 text-amber-500/60" />
        </button>
      </div>
      <div className="space-y-4 p-4 sm:p-6">
        {summary ? (
          <Notice tone={summary.tone}>
            {summary.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </Notice>
        ) : null}
        {!enabled || candidates.length === 0 ? (
          <NoCandidates
            enabled={enabled}
            hasFriends={friends.length > 0}
            onFindPlayers={() => {
              onClose();
              openSocial('find');
            }}
          />
        ) : (
          <>
            <ul className="max-h-[45vh] space-y-1 overflow-y-auto overscroll-contain" aria-label="Friends">
              {candidates.map((friend) => {
                const checked = selected.has(friend.userId);
                const online = friend.presence.status !== 'offline';
                return (
                  <li key={friend.userId}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      disabled={!checked && limitReached}
                      onClick={() => setSelected((current) => toggleInvite(current, friend.userId))}
                      className={`flex w-full min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'border-amber-500/60 bg-amber-900/30' : 'border-amber-900/30 hover:border-amber-700/50'}`}
                    >
                      <PlayerAvatar avatarId={friend.avatar ?? 'wizard'} level={friend.level} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-amber-100" style={SERIF}>
                          {friend.displayName}
                        </span>
                        <span className={`block text-[11px] ${online ? 'text-emerald-300/70' : 'text-amber-200/35'}`}>{online ? 'Online' : 'Offline'}</span>
                      </span>
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? 'border-amber-400 bg-amber-600/70 text-amber-50' : 'border-amber-800/60'}`}
                      >
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {limitReached ? (
              <p className="text-xs text-amber-200/45">Up to {TOURNAMENT_LIMITS.MAX_INVITES_PER_REQUEST} players per invite. Send these, then pick more.</p>
            ) : null}
            <Button variant="primary" block onClick={send} loading={sending} disabled={selected.size === 0} icon={<Send className="h-4 w-4" />}>
              {inviteButtonLabel(selected.size)}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
