'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { GameAlreadyStartedError, MaxPlayersReachedError, PlayerKickedError, ROOM_PLAYER_LIMITS, RoomFullError } from '@shared/domain';
import { AlertTriangle, ArrowLeft, Check, Clock, Crown, DoorClosed, Loader2, LogOut, Sparkles, UserMinus, UserPlus, Users, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../../account/PlayerAvatar';
import { GOLD_BUTTON_STYLE, LOBBY_GRID_CLASS, LOBBY_PAGE_CLASS, LOBBY_SLOT, SERIF, SURFACE_STYLE, TABLE_BOX_CLASS } from './lobby-styles';
import type { LobbyActivityView } from './lobby-view.types';

/* ─────────── loading skeleton ─────────── */

function Bone({ className }: { className: string }) {
  return <div className={`bg-amber-900/30 animate-pulse ${className}`} />;
}

/** Same shapes as the real lobby so nothing jumps when the room state arrives. */
export function LobbySkeleton() {
  const positions = [90, 150, 210, 270, 330, 30];
  return (
    <div className={LOBBY_PAGE_CLASS} aria-busy="true" aria-label="Loading table">
      <div className={LOBBY_GRID_CLASS}>
        <div className={LOBBY_SLOT.panel} />
        <div className={`relative flex items-center gap-2 ${LOBBY_SLOT.top}`}>
          <Bone className="h-11 w-36 rounded-full" />
          <Bone className="h-6 w-16 rounded-full" />
          <div className="ml-auto flex gap-2"><Bone className="w-11 h-11 rounded-full" /><Bone className="w-11 h-11 rounded-full" /></div>
        </div>
        <div className={TABLE_BOX_CLASS}>
          <Bone className="absolute inset-[13%_9%] rounded-[50%]" />
          {positions.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return <div key={deg} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${50 + 44 * Math.cos(rad)}%`, top: `${50 + 44 * Math.sin(rad)}%` }}><Bone className="w-14 h-14 rounded-full" /></div>;
          })}
        </div>
        <div className={`flex gap-1.5 ${LOBBY_SLOT.info}`}><Bone className="h-7 w-24 rounded-full" /><Bone className="h-7 w-20 rounded-full" /><Bone className="h-7 w-28 rounded-full" /></div>
        <div className={`relative ${LOBBY_SLOT.actions} split:px-5 split:pb-5`}><Bone className="h-12 w-full rounded-xl mt-8" /></div>
      </div>
    </div>
  );
}

/* ─────────── joining ─────────── */

export type JoinStep = 'connecting' | 'seating' | 'syncing';
const JOIN_STEPS: { id: JoinStep; label: (room: string) => string }[] = [
  { id: 'connecting', label: (room) => `Finding room ${room.toUpperCase()}` },
  { id: 'seating', label: () => 'Taking your seat' },
  { id: 'syncing', label: () => 'Syncing the table rules' },
];

export function JoiningScreen({ roomId, step, onCancel }: { roomId: string; step: JoinStep; onCancel: () => void }) {
  const activeIndex = JOIN_STEPS.findIndex((s) => s.id === step);
  return (
    <div className="relative z-10 max-w-sm mx-auto px-6 pt-24 pb-10 text-center" role="status" aria-live="polite">
      <div className="mx-auto w-16 h-16 rounded-2xl border-2 border-amber-600/60 flex items-center justify-center mb-5" style={{ ...SURFACE_STYLE, boxShadow: '0 8px 32px var(--glow)' }}>
        <Sparkles className="w-7 h-7 text-amber-300 animate-pulse" />
      </div>
      <h1 className="text-amber-100 text-xl mb-6" style={SERIF}>Joining the table</h1>
      <ul className="inline-flex flex-col gap-3 text-left">
        {JOIN_STEPS.map((s, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={s.id} className={`flex items-center gap-2.5 text-sm ${done ? 'text-amber-200' : active ? 'text-amber-50' : 'text-amber-700'}`} style={SERIF}>
              {done ? <Check className="w-4 h-4 text-emerald-400" /> : active ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <span className="w-4 h-4 rounded-full border border-amber-800" />}
              {s.label(roomId)}
            </li>
          );
        })}
      </ul>
      <div className="mt-10">
        <button type="button" onClick={onCancel} className="text-sm text-amber-500 underline underline-offset-2 decoration-amber-800 cursor-pointer" style={SERIF}>Cancel</button>
      </div>
    </div>
  );
}

/* ─────────── connection banner ─────────── */

export function ConnectionBanner({ isConnected, attempt }: { isConnected: boolean; attempt?: number }) {
  return (
    <AnimatePresence>
      {isConnected ? null : (
        <motion.div
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-40 flex items-center justify-center gap-2 px-4 py-2.5 text-sm border-b border-amber-500/50 bg-amber-900/90 text-amber-50 backdrop-blur"
          style={SERIF}
        >
          <WifiOff className="w-4 h-4" />
          Connection lost · reconnecting{attempt ? ` (${attempt})` : ''}
          <Loader2 className="w-4 h-4 animate-spin" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────── live activity toasts ─────────── */

const ACTIVITY_ICON: Record<LobbyActivityView['kind'], React.ReactNode> = {
  joined: <UserPlus className="w-4 h-4 text-emerald-300" />,
  'invite-accepted': <UserPlus className="w-4 h-4 text-emerald-300" />,
  left: <LogOut className="w-4 h-4 text-amber-300" />,
  kicked: <UserMinus className="w-4 h-4 text-red-300" />,
  host: <Crown className="w-4 h-4 text-amber-300" />,
  rules: <Clock className="w-4 h-4 text-amber-300" />,
  settings: <Clock className="w-4 h-4 text-amber-300" />,
};

/**
 * Phones: a stack under the top bar. Split (desktop): the bottom-left corner, beside the table.
 * Landscape phones have no free corner, so only the newest toast shows, in the gap above the table
 * and the panel.
 */
export function LobbyToasts({ items }: { items: LobbyActivityView[] }) {
  return (
    <div className="fixed top-16 inset-x-0 z-30 flex flex-col items-center gap-2 px-4 pointer-events-none split:top-auto split:bottom-6 split:right-auto split:items-start split:px-6 landscape-phone:top-1.5 landscape-phone:bottom-auto landscape-phone:right-0 landscape-phone:items-center landscape-phone:[&>*:not(:last-child)]:hidden landscape-phone:[&>*]:py-0.5 landscape-phone:[&>*]:text-xs" aria-live="polite">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ y: -16, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full border shadow-lg max-w-full"
            style={{ ...SURFACE_STYLE, backdropFilter: 'blur(10px)', ...SERIF }}
          >
            {item.avatarId ? <PlayerAvatar avatarId={item.avatarId} size="sm" /> : <span className="w-8 h-8 rounded-full flex items-center justify-center">{ACTIVITY_ICON[item.kind]}</span>}
            <span className="text-amber-50 text-sm truncate">{item.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─────────── errors ─────────── */

export type LobbyErrorKind = 'full' | 'started' | 'kicked' | 'generic';

const ERRORS: Record<LobbyErrorKind, { icon: React.ReactNode; title: string; body: (room: string) => string }> = {
  full: { icon: <Users className="w-6 h-6" />, title: 'This table is full', body: (room) => `All seats at ${room.toUpperCase()} are taken. Ask the host to open another seat, or start your own table.` },
  started: { icon: <DoorClosed className="w-6 h-6" />, title: 'The game already started', body: () => 'You can join the next game at this table once it ends, or start your own now.' },
  kicked: { icon: <UserMinus className="w-6 h-6" />, title: 'You were removed from the table', body: () => "The host removed you from this table, so you can't rejoin it." },
  generic: { icon: <AlertTriangle className="w-6 h-6" />, title: "Couldn't join the table", body: () => 'Something went wrong on the way in.' },
};

/**
 * Join refusals with a screen of their own, keyed by the exact text of the domain errors. Whole
 * messages, never substrings: other refusals quote the player's name ("The name "Mindful" is
 * already taken") and must stay on the join form, where the player can fix them.
 */
const JOIN_REFUSAL_SCREENS: ReadonlyMap<string, LobbyErrorKind> = new Map<string, LobbyErrorKind>([
  [PlayerKickedError.MESSAGE, 'kicked'],
  [new RoomFullError().message, 'full'],
  ...Array.from({ length: ROOM_PLAYER_LIMITS.MAX - ROOM_PLAYER_LIMITS.MIN + 1 }, (_, index): [string, LobbyErrorKind] => [
    new MaxPlayersReachedError(ROOM_PLAYER_LIMITS.MIN + index).message,
    'full',
  ]),
  [new GameAlreadyStartedError().message, 'started'],
]);

/** Maps the server's error text to a screen; the raw text stays as detail for "generic". */
export function classifyLobbyError(error: string): LobbyErrorKind {
  return JOIN_REFUSAL_SCREENS.get(error) ?? 'generic';
}

export function LobbyErrorScreen({ kind, roomId, detail, onRetry }: { kind: LobbyErrorKind; roomId: string; detail?: string; onRetry?: () => void }) {
  const error = ERRORS[kind];
  const canRetry = kind === 'generic' && onRetry;
  return (
    <div className="relative z-10 max-w-sm mx-auto px-4 pt-20 pb-10" role="alert">
      <div className="rounded-2xl border p-6 text-center" style={{ ...SURFACE_STYLE, boxShadow: '0 8px 40px rgba(0,0,0,0.45)' }}>
        <div className="mx-auto w-12 h-12 rounded-full border border-amber-600/50 flex items-center justify-center mb-3 text-amber-300">{error.icon}</div>
        <h1 className="text-amber-50 text-lg" style={SERIF}>{error.title}</h1>
        <p className="text-amber-400/90 text-sm mt-1.5" style={SERIF}>{error.body(roomId)}</p>
        {kind === 'generic' && detail ? <p className="text-amber-600 text-xs mt-2 font-mono break-words">{detail}</p> : null}
        <div className="mt-5 flex gap-2">
          {canRetry ? (
            <>
              <Link href="/" className="flex-1 h-11 rounded-xl border border-amber-700/50 text-amber-200 text-sm flex items-center justify-center gap-1.5" style={SERIF}>
                <ArrowLeft className="w-4 h-4" />Home
              </Link>
              <button type="button" onClick={onRetry} className="flex-1 h-11 rounded-xl text-sm flex items-center justify-center gap-1.5 cursor-pointer" style={GOLD_BUTTON_STYLE}>Try again</button>
            </>
          ) : (
            <Link href="/" className="flex-1 h-11 rounded-xl text-sm flex items-center justify-center gap-1.5" style={GOLD_BUTTON_STYLE}>
              <Sparkles className="w-4 h-4" />Find another table
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
