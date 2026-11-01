'use client';

import { useState } from 'react';
import { Check, Copy, Eye, Globe, Hourglass, Lock, LogOut, Settings2, Share2, Sparkles, Timer, UserPlus, X } from 'lucide-react';
import { PlayerAvatar } from '../../account/PlayerAvatar';
import { CHIP_CLASS, GOLD_BUTTON_STYLE, SERIF, SURFACE_STYLE } from './lobby-styles';
import type { LobbyInviteView, RuleChip, StartReadiness } from './lobby-view.types';
import { LobbyPanelBackdrop, LobbyPanelDecor, LobbyStartButtonDecor } from '../skins/LobbyDecor';
import { LobbyCopy, LobbyIcon } from '../skins/LobbySkinText';
import { useLobbySkin } from '../skins/useLobbySkin';

/* ─────────── top bar ─────────── */

interface LobbyTopBarProps {
  roomId: string;
  isPublic: boolean;
  onCopyLink: () => Promise<void> | void;
  onShare: () => void;
  onOpenSettings: () => void;
  isHost: boolean;
  className?: string;
}

export function LobbyTopBar({ roomId, isPublic, onCopyLink, onShare, onOpenSettings, isHost, className = '' }: LobbyTopBarProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    // Positioned so it paints above the theme vignette and the lobby panel card behind it.
    <div className={`relative flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={copy}
        aria-label={`Room code ${roomId}, copy invite link`}
        className="flex items-center gap-2 h-11 pl-3.5 pr-3 rounded-full border text-amber-50 cursor-pointer hover:border-amber-500/60 transition-colors"
        style={{ ...SURFACE_STYLE, backdropFilter: 'blur(6px)' }}
      >
        <span className="font-mono text-base tracking-[0.25em] uppercase">{roomId}</span>
        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-500/80" />}
      </button>
      <span className={`${CHIP_CLASS} border-amber-800/50 text-amber-400/90`} style={SERIF}>
        {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
        {isPublic ? 'Public' : 'Private'}
      </span>
      <span aria-live="polite" className="sr-only">{copied ? 'Invite link copied' : ''}</span>
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onShare} aria-label="Share room" className="w-11 h-11 rounded-full border text-amber-300 flex items-center justify-center cursor-pointer hover:text-amber-100" style={SURFACE_STYLE}>
          <Share2 className="w-4 h-4" />
        </button>
        <button type="button" onClick={onOpenSettings} aria-label={isHost ? 'Table settings' : 'Table rules'} className="w-11 h-11 rounded-full border text-amber-300 flex items-center justify-center cursor-pointer hover:text-amber-100" style={SURFACE_STYLE}>
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────── invites ─────────── */

const INVITE_STATE_LABEL: Record<LobbyInviteView['state'], string> = {
  pending: 'sent',
  seen: 'seen',
  accepted: 'joining',
  declined: 'declined',
  expired: 'expired',
  revoked: 'revoked',
};

interface InvitedStripProps {
  invites: LobbyInviteView[];
  canInvite: boolean;
  onRevoke: (inviteId: string) => void;
  onInvite: () => void;
}

/** Live list of the invites you sent for this table, with revoke; a quick "Invite" when empty. */
export function InvitedStrip({ invites, canInvite, onRevoke, onInvite }: InvitedStripProps) {
  const visible = invites.filter((invite) => invite.state !== 'revoked');
  if (!canInvite && visible.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.length ? <span className="text-xs text-amber-500/90 mr-0.5" style={SERIF}>Invited</span> : null}
      {visible.map((invite) => {
        const live = invite.state === 'pending' || invite.state === 'seen';
        return (
          <span
            key={invite.id}
            className={`inline-flex items-center gap-1.5 pl-0.5 pr-1 py-0.5 rounded-full border text-xs ${live ? 'border-amber-700/50 text-amber-100' : 'border-amber-900/50 text-amber-600/80'}`}
            style={SERIF}
          >
            <PlayerAvatar appearance={invite.appearance} label={invite.name} size="xs" />
            {invite.name}
            <span className={`flex items-center gap-0.5 ${invite.state === 'declined' ? 'text-red-300/80' : 'text-amber-500/90'}`}>
              {invite.state === 'seen' ? <Eye className="w-3 h-3" /> : invite.state === 'pending' ? <Hourglass className="w-3 h-3" /> : null}
              {INVITE_STATE_LABEL[invite.state]}
            </span>
            {live ? (
              <button type="button" onClick={() => onRevoke(invite.id)} aria-label={`Revoke invite for ${invite.name}`} className="w-7 h-7 -my-1 rounded-full flex items-center justify-center text-amber-500/80 hover:text-red-300 hover:bg-red-900/25 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : <span className="w-1.5" />}
          </span>
        );
      })}
      {canInvite ? (
        <button type="button" onClick={onInvite} className={`${CHIP_CLASS} border-dashed border-amber-600/60 text-amber-300 hover:text-amber-100 cursor-pointer`} style={SERIF}>
          <UserPlus className="w-3.5 h-3.5" />Invite friends
        </button>
      ) : null}
    </div>
  );
}

/* ─────────── rules ─────────── */

interface RulesChipsProps {
  chips: RuleChip[];
  highlightId: string | null;
  onOpen: () => void;
}

export function RulesChips({ chips, highlightId, onOpen }: RulesChipsProps) {
  return (
    <button type="button" onClick={onOpen} className="w-full flex flex-wrap items-center gap-1.5 text-left cursor-pointer" aria-label="Show table rules">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={`${CHIP_CLASS} transition-colors duration-700 ${
            chip.id === highlightId ? 'border-amber-300 bg-amber-500/35 text-amber-50' : chip.isHouseRule ? 'border-amber-600/60 text-amber-200' : 'border-amber-800/50 text-amber-400/90'
          }`}
          style={SERIF}
        >
          {chip.icon === 'timer' ? <Timer className="w-3 h-3" /> : null}
          {chip.label}
        </span>
      ))}
      <span className="text-xs text-amber-500/80 underline underline-offset-2 decoration-amber-700/60 ml-1" style={SERIF}>All rules</span>
    </button>
  );
}

/* ─────────── bottom bar ─────────── */

interface LobbyBottomBarProps {
  isHost: boolean;
  isReady: boolean;
  readiness: StartReadiness;
  playerCount: number;
  isStarting: boolean;
  onStart: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  className?: string;
}

/**
 * Readiness line, leave and start/ready. Stacked, a bar pinned to the bottom of the screen; in
 * the lobby's split layout it sits flat at the foot of the control panel.
 */
export function LobbyBottomBar({ isHost, isReady, readiness, playerCount, isStarting, onStart, onToggleReady, onLeave, className = '' }: LobbyBottomBarProps) {
  return (
    <div
      className={`sticky bottom-0 z-20 isolate -mx-4 sm:mx-0 mt-6 px-4 pt-3 border-t sm:rounded-2xl sm:border border-[var(--surface-border)] bg-[var(--surface)] backdrop-blur-md split:relative split:z-auto split:mt-4 split:px-5 split:pt-4 split:rounded-t-none split:rounded-b-3xl split:border-x-0 split:border-b-0 split:bg-transparent split:backdrop-blur-none ${className}`}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <LobbyPanelBackdrop variant="actions" />
      <LobbyPanelDecor variant="actions" />
      <p className="text-center text-xs text-amber-500/90 mb-2.5" style={SERIF} aria-live="polite">{readiness.reason}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onLeave} aria-label="Leave table" className="w-12 h-12 shrink-0 rounded-xl border border-amber-700/50 text-amber-300 flex items-center justify-center cursor-pointer hover:text-amber-100 hover:bg-amber-900/25">
          <LogOut className="w-5 h-5" />
        </button>
        {isHost ? (
          <HostStartButton canStart={readiness.canStart} isStarting={isStarting} playerCount={playerCount} onStart={onStart} />
        ) : (
          <button
            type="button"
            onClick={onToggleReady}
            aria-pressed={isReady}
            className={`relative isolate flex-1 h-12 rounded-xl border-2 flex items-center justify-center gap-2 text-base cursor-pointer active:scale-[0.98] transition-colors ${
              isReady ? 'border-emerald-500/70 bg-emerald-900/30 text-emerald-100' : 'border-amber-500/60 text-amber-100 hover:bg-amber-900/25'
            }`}
            style={SERIF}
          >
            {/* Theme decor only while not ready, so the green ready state stays unmistakable. */}
            {isReady ? null : <LobbyStartButtonDecor mode="guest" />}
            <Check className="w-5 h-5 relative" />
            {isReady ? "Ready · tap to undo" : "I'm ready"}
          </button>
        )}
      </div>
    </div>
  );
}

interface HostStartButtonProps {
  canStart: boolean;
  isStarting: boolean;
  playerCount: number;
  onStart: () => void;
}

/** The host's start button; a theme skin may repaint it (startButtonStyle) and decorate it. */
function HostStartButton({ canStart, isStarting, playerCount, onStart }: HostStartButtonProps) {
  const skin = useLobbySkin();
  const mode = canStart ? 'ready' : 'waiting';
  const label = isStarting ? 'Dealing cards…' : `Start game · ${playerCount} players`;
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!canStart || isStarting}
      className={`relative isolate flex-1 h-12 rounded-xl flex items-center justify-center gap-2 text-base cursor-pointer active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed ${skin.classNames?.startButton ?? ''}`}
      style={{ ...GOLD_BUTTON_STYLE, ...skin.startButtonStyle?.[mode] }}
    >
      <LobbyStartButtonDecor mode={mode} />
      <LobbyIcon id="start" className="w-4 h-4"><Sparkles className="w-4 h-4 relative" /></LobbyIcon>
      <span className="relative">{isStarting ? label : <LobbyCopy id={canStart ? 'startReady' : 'startWaiting'}>{label}</LobbyCopy>}</span>
    </button>
  );
}
