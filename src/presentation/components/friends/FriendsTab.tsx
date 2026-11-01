'use client';

import { useState, type FormEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { Check, Pin, UserPlus, Users, X } from 'lucide-react';

import type { FriendRequestView } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useSocial, useSocialPanel } from '@/presentation/providers/SocialProvider';

import { PlayerAvatar } from '../account/PlayerAvatar';
import { Notice, SERIF } from '../account/ui';
import { FriendRow } from './FriendRow';
import { useSocialActions } from './useSocialActions';

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 px-1 mt-4 mb-2 text-[11px] uppercase tracking-wider text-amber-400/60" style={SERIF}>
      {children}
      {count !== undefined ? <span className="text-amber-500/40">{count}</span> : null}
    </h3>
  );
}

function RequestRow({ request, incoming, actions }: { request: FriendRequestView; incoming: boolean; actions: ReturnType<typeof useSocialActions> }) {
  const { player } = request;
  return (
    <li className="flex items-center gap-3 rounded-xl border border-amber-700/30 px-3 py-2.5 animate-in" style={{ background: 'color-mix(in srgb, var(--color-amber-900) 25%, transparent)' }}>
      <PlayerAvatar avatarId={player.avatar ?? 'wizard'} level={player.level} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-amber-100" style={SERIF}>{player.displayName}</span>
        <span className="block text-xs text-amber-200/45">{incoming ? 'wants to be friends' : 'request sent'}</span>
      </span>
      {incoming ? (
        <>
          <button type="button" aria-label={`Accept ${player.displayName}`} className="w-9 h-9 inline-flex items-center justify-center rounded-lg bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/50 cursor-pointer" onClick={() => void actions.run(`accept:${player.userId}`, () => socialApi.respondToRequest(player.userId, true), `You and ${player.displayName} are now friends!`)}>
            <Check className="w-4 h-4" />
          </button>
          <button type="button" aria-label={`Decline ${player.displayName}`} className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-amber-300/60 hover:bg-amber-900/30 cursor-pointer" onClick={() => void actions.run(`decline:${player.userId}`, () => socialApi.respondToRequest(player.userId, false))}>
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button type="button" className="h-8 px-3 rounded-lg border border-amber-800/40 text-xs text-amber-200/70 hover:text-amber-100 cursor-pointer" onClick={() => void actions.run(`cancel:${player.userId}`, () => socialApi.cancelRequest(player.userId))}>
          Cancel
        </button>
      )}
    </li>
  );
}

/** Add by exact name, like a Riot ID: also finds players with a private profile. */
function AddByHandle({ actions }: { actions: ReturnType<typeof useSocialActions> }) {
  const [handle, setHandle] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const username = handle.trim().replace(/^@/, '');
    if (!username) return;
    const result = await actions.run('add-handle', () => socialApi.sendFriendRequest({ username }));
    if (result) setHandle('');
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="Add by name" aria-label="Name to add" maxLength={21} className="wp-field min-w-0 flex-1 h-10 px-3 rounded-xl border border-amber-700/25 text-sm focus:outline-none focus:border-amber-500/60" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)', color: 'color-mix(in srgb, var(--color-amber-100) 95%, transparent)' }} />
      <button type="submit" disabled={actions.busy === 'add-handle'} className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-amber-600/50 text-sm text-amber-100 hover:bg-amber-900/30 cursor-pointer disabled:opacity-50" style={SERIF}>
        <UserPlus className="w-4 h-4" /> Add
      </button>
    </form>
  );
}

export function FriendsTab() {
  const { friends, incoming, outgoing } = useSocial();
  const { open } = useSocialPanel();
  const actions = useSocialActions();
  const pinned = friends.filter((friend) => friend.pinnedAt !== null);
  const online = friends.filter((friend) => friend.pinnedAt === null && friend.presence.status !== 'offline');
  const offline = friends.filter((friend) => friend.pinnedAt === null && friend.presence.status === 'offline');

  return (
    <div>
      <AddByHandle actions={actions} />
      {actions.error ? <Notice tone="error" className="mt-3">{actions.error}</Notice> : null}
      {actions.notice ? <Notice tone="success" className="mt-3">{actions.notice}</Notice> : null}

      {incoming.length > 0 ? <SectionTitle count={incoming.length}>Requests</SectionTitle> : null}
      <ul className="space-y-2">{incoming.map((request) => <RequestRow key={request.player.userId} request={request} incoming actions={actions} />)}</ul>

      {friends.length === 0 ? (
        <div className="mt-8 text-center px-4">
          <Users className="w-10 h-10 mx-auto text-amber-700/50" />
          <p className="mt-3 text-sm text-amber-200/60" style={SERIF}>No friends yet</p>
          <p className="mt-1 text-xs text-amber-200/40">Add players by their name, search for them, or add the people you just played with.</p>
          <button type="button" onClick={() => open('find')} className="mt-4 h-10 px-4 rounded-xl border border-amber-600/50 text-sm text-amber-100 hover:bg-amber-900/30 cursor-pointer" style={SERIF}>Find players</button>
        </div>
      ) : null}

      {pinned.length > 0 ? <SectionTitle count={pinned.length}><Pin className="w-3 h-3" /> Pinned</SectionTitle> : null}
      <ul className="space-y-2"><AnimatePresence initial={false}>{pinned.map((friend) => <FriendRow key={friend.userId} friend={friend} actions={actions} />)}</AnimatePresence></ul>
      {online.length > 0 ? <SectionTitle count={online.length}>Online</SectionTitle> : null}
      <ul className="space-y-2"><AnimatePresence initial={false}>{online.map((friend) => <FriendRow key={friend.userId} friend={friend} actions={actions} />)}</AnimatePresence></ul>
      {offline.length > 0 ? <SectionTitle count={offline.length}>Offline</SectionTitle> : null}
      <ul className="space-y-2"><AnimatePresence initial={false}>{offline.map((friend) => <FriendRow key={friend.userId} friend={friend} actions={actions} />)}</AnimatePresence></ul>

      {outgoing.length > 0 ? <SectionTitle count={outgoing.length}>Sent requests</SectionTitle> : null}
      <ul className="space-y-2">{outgoing.map((request) => <RequestRow key={request.player.userId} request={request} incoming={false} actions={actions} />)}</ul>
    </div>
  );
}
