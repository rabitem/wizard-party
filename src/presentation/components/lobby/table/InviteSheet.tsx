'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Eye, Search } from 'lucide-react';
import { PlayerAvatar } from '../../account/PlayerAvatar';
import { LobbySheet } from './LobbySheet';
import { FIELD_BG, GOLD_BUTTON_STYLE, SERIF } from './lobby-styles';
import type { LobbyFriendView } from './lobby-view.types';

interface InviteSheetProps {
  friends: LobbyFriendView[];
  isLoading: boolean;
  shareUrl: string;
  busyUserId: string | null;
  message: { tone: 'error' | 'info'; text: string } | null;
  onInvite: (friend: LobbyFriendView) => void;
  onRevoke: (inviteId: string) => void;
  onCopyLink: () => Promise<void> | void;
  onClose: () => void;
}

const GROUPS: { id: string; label: string; match: (friend: LobbyFriendView) => boolean }[] = [
  { id: 'online', label: 'Online', match: (f) => f.presence !== 'offline' && f.activity !== 'game' },
  { id: 'game', label: 'In a game', match: (f) => f.presence !== 'offline' && f.activity === 'game' },
  { id: 'offline', label: 'Offline · they get an email', match: (f) => f.presence === 'offline' },
];

const DOT: Record<LobbyFriendView['presence'], string> = { online: 'bg-emerald-400', away: 'bg-amber-400', busy: 'bg-red-400', offline: 'bg-stone-500' };

function FriendRow({ friend, busy, onInvite, onRevoke }: { friend: LobbyFriendView; busy: boolean; onInvite: () => void; onRevoke: () => void }) {
  const invited = friend.inviteState === 'pending' || friend.inviteState === 'seen';
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="relative">
        <PlayerAvatar avatarId={friend.avatarId} level={friend.level} />
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-black/60 ${DOT[friend.presence]}`} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-amber-100 text-[15px] truncate" style={SERIF}>{friend.name}</p>
        {friend.isSeated ? (
          <p className="text-xs text-emerald-300/90" style={SERIF}>At your table</p>
        ) : invited ? (
          <p className="text-xs text-amber-500/90 flex items-center gap-1" style={SERIF}>
            {friend.inviteState === 'seen' ? <><Eye className="w-3 h-3" />Invite seen</> : 'Invite sent'}
          </p>
        ) : friend.inviteState === 'declined' ? (
          <p className="text-xs text-red-300/80" style={SERIF}>Declined</p>
        ) : null}
      </div>
      {friend.isSeated ? (
        <Check className="w-5 h-5 text-emerald-400" aria-label="Seated" />
      ) : invited && friend.inviteId ? (
        <button type="button" onClick={onRevoke} disabled={busy} className="h-9 px-3 rounded-lg text-xs text-amber-300 border border-amber-700/60 hover:border-red-400/60 hover:text-red-200 cursor-pointer disabled:opacity-50" style={SERIF}>
          Revoke
        </button>
      ) : (
        <button type="button" onClick={onInvite} disabled={busy} className="h-11 px-4 rounded-lg text-sm cursor-pointer active:scale-95 disabled:opacity-50" style={GOLD_BUTTON_STYLE}>
          {busy ? 'Sending…' : friend.inviteState === 'declined' || friend.inviteState === 'expired' ? 'Invite again' : 'Invite'}
        </button>
      )}
    </li>
  );
}

/** Friends grouped by presence with one-tap invite and revoke; non-friends get the link. */
export function InviteSheet({ friends, isLoading, shareUrl, busyUserId, message, onInvite, onRevoke, onCopyLink, onClose }: InviteSheetProps) {
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? friends.filter((friend) => friend.name.toLowerCase().includes(needle)) : friends;
  }, [friends, query]);

  const copy = async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LobbySheet title="Invite to your table" onClose={onClose} skinVariant="count">
      {friends.length > 5 ? (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/80" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            aria-label="Search friends"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-700/40 text-amber-50 placeholder-amber-600/50 text-base"
            style={{ background: FIELD_BG, ...SERIF }}
          />
        </div>
      ) : null}

      {message ? (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mb-3 text-xs ${message.tone === 'error' ? 'text-red-300' : 'text-emerald-300'}`} style={SERIF}>{message.text}</p>
      ) : null}

      {isLoading ? (
        <ul aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 py-2">
              <span className="w-10 h-10 rounded-full bg-amber-900/30 animate-pulse" />
              <span className="h-3.5 w-28 rounded bg-amber-900/30 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : friends.length === 0 ? (
        <p className="py-4 text-sm text-amber-400/90" style={SERIF}>Add friends from their profile or the social panel to invite them with one tap.</p>
      ) : (
        GROUPS.map((group) => {
          const members = filtered.filter(group.match);
          if (!members.length) return null;
          return (
            <section key={group.id} className="mb-3">
              <h3 className="text-sm text-amber-100 mb-0.5" style={SERIF}>{group.label}</h3>
              <ul>
                {members.map((friend) => (
                  <FriendRow
                    key={friend.userId}
                    friend={friend}
                    busy={busyUserId === friend.userId}
                    onInvite={() => onInvite(friend)}
                    onRevoke={() => friend.inviteId && onRevoke(friend.inviteId)}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <div className="mt-2 p-3 rounded-xl border border-dashed border-amber-700/50 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-amber-100 text-sm" style={SERIF}>Not friends yet?</p>
          <p className="text-xs text-amber-500/90 truncate" style={SERIF}>{shareUrl.replace(/^https?:\/\//, '')}</p>
        </div>
        <button type="button" onClick={copy} className="h-9 px-3 rounded-lg border border-amber-600/60 text-amber-100 text-xs flex items-center gap-1.5 cursor-pointer" style={SERIF}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </LobbySheet>
  );
}
