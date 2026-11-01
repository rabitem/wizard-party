'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Loader2, Play, Settings2, Shield } from 'lucide-react';
import type { UsernameValidationStatus } from '@/presentation/hooks/useUsernameValidation';
import { PlayerAvatar } from '../account/PlayerAvatar';
import { isValidRoomCode, parseRoomCodeInput } from './room-code';
import { ROOM_CODE_MAX, ROOM_CODE_MIN } from './utils';

const SERIF = { fontFamily: 'Georgia, serif' } as const;
const NAME_MAX_LENGTH = 20;
const FIELD_BG = 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)';
const GOLD = 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 55%, var(--accent-cta-bottom) 100%)';

type PlayAction = 'quick' | 'code' | 'create';

export interface PlayCardIdentity {
  /** Account state decides whether the name is asked for or is the account's username. */
  accountStatus: 'loading' | 'guest' | 'signed-in';
  accountLevel?: number;
  /** Name that will be used to join: the username when signed in, else the guest's name. */
  name: string;
  /** Edits the guest name; signed-in players change their name on the profile. */
  onNameChange: (value: string) => void;
}

export interface PlayCardValidation {
  status: UsernameValidationStatus;
  isChecking: boolean;
  isTaken: boolean;
}

interface PlayCardProps {
  identity: PlayCardIdentity;
  validation: PlayCardValidation;
  canPlay: boolean;
  isLoading: boolean;
  /** Room from an invite link the player still has to confirm. */
  pendingRoomId: string | null;
  onQuickJoin: () => void;
  onJoinByCode: (roomId: string) => void;
  onCreateRoom: () => void;
}

function Corners() {
  const base = 'absolute w-1.5 h-1.5 pointer-events-none border-amber-500/40';
  return (
    <>
      <span className={`${base} top-0.5 left-0.5 border-t border-l`} />
      <span className={`${base} top-0.5 right-0.5 border-t border-r`} />
      <span className={`${base} bottom-0.5 left-0.5 border-b border-l`} />
      <span className={`${base} bottom-0.5 right-0.5 border-b border-r`} />
    </>
  );
}

function nameProblem(validation: PlayCardValidation): string | null {
  if (validation.isTaken) return 'This name belongs to a registered player. Pick another one.';
  return null;
}

function NameMessage({ validation, showRequired }: { validation: PlayCardValidation; showRequired: boolean }) {
  const problem = nameProblem(validation) ?? (showRequired ? 'Enter a name first so the table knows who you are.' : null);
  if (!problem) return null;
  return (
    <p id="play-name-message" role="alert" className="mt-2 text-xs text-red-300/90" style={SERIF}>
      {problem}
    </p>
  );
}

function NameStatus({ validation, name }: { validation: PlayCardValidation; name: string }) {
  if (!name.trim()) return null;
  if (validation.isChecking) return <Loader2 className="w-4 h-4 text-amber-500/70 animate-spin" aria-label="Checking name" />;
  if (validation.status === 'available') return <Shield className="w-4 h-4 text-emerald-500/70" aria-label="Name available" />;
  return null;
}

function NameField({
  identity,
  validation,
  showRequired,
  inputRef,
}: {
  identity: PlayCardIdentity;
  validation: PlayCardValidation;
  showRequired: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const invalid = showRequired || Boolean(nameProblem(validation));
  return (
    <div>
      <label htmlFor="play-name" className="block text-amber-500/70 text-xs mb-1.5" style={SERIF}>
        What should we call you?
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id="play-name"
          type="text"
          value={identity.name}
          onChange={(e) => identity.onNameChange(e.target.value)}
          placeholder="Your wizard name"
          maxLength={NAME_MAX_LENGTH}
          autoComplete="nickname"
          enterKeyHint="done"
          aria-invalid={invalid}
          aria-describedby="play-name-message"
          className={`w-full pl-4 pr-20 py-3 rounded-xl border text-base text-amber-50 placeholder-amber-600/40 focus:ring-2 focus:ring-amber-500/10 transition-colors ${
            invalid ? 'border-red-500/50 focus:border-red-400/60' : 'border-amber-700/30 focus:border-amber-500/50'
          }`}
          style={{ background: FIELD_BG, ...SERIF }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none" suppressHydrationWarning>
          {identity.name.length > 0 ? (
            <span className="text-[10px] font-mono" style={{ color: identity.name.length >= NAME_MAX_LENGTH - 2 ? 'var(--color-amber-500)' : 'color-mix(in srgb, var(--text-muted) 50%, transparent)' }}>
              {identity.name.length}/{NAME_MAX_LENGTH}
            </span>
          ) : null}
          <NameStatus validation={validation} name={identity.name} />
        </div>
      </div>
      <NameMessage validation={validation} showRequired={showRequired} />
    </div>
  );
}

/** "Playing as …" line for signed-in players: always their username, changed on the profile. */
function AccountLine({ identity, validation }: { identity: PlayCardIdentity; validation: PlayCardValidation }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 text-sm" style={SERIF}>
        <PlayerAvatar size="sm" level={identity.accountLevel} />
        <span className="text-amber-500/70 shrink-0">Playing as</span>
        <span className="text-amber-100 truncate min-w-0">{identity.name}</span>
        <Link
          href="/account?tab=profile"
          title="Change your name on your profile"
          className="ml-auto shrink-0 py-1 text-xs text-amber-500/70 hover:text-amber-300 underline decoration-amber-700/60 underline-offset-2"
        >
          change
        </Link>
      </div>
      <NameMessage validation={validation} showRequired={false} />
    </div>
  );
}

function Identity(props: { identity: PlayCardIdentity; validation: PlayCardValidation; showRequired: boolean; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const { identity } = props;
  if (identity.accountStatus === 'loading') {
    return <div className="h-8 w-48 rounded-full bg-amber-900/20 animate-pulse" aria-hidden />;
  }
  if (identity.accountStatus === 'signed-in') {
    return <AccountLine identity={identity} validation={props.validation} />;
  }
  return <NameField {...props} />;
}

function JoinByCodeForm({
  busy,
  disabled,
  initialCode,
  invitedTo,
  onJoin,
}: {
  busy: boolean;
  disabled: boolean;
  initialCode: string;
  invitedTo: string | null;
  onJoin: (roomId: string) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [touched, setTouched] = useState(false);
  const valid = isValidRoomCode(code);
  const showHint = touched && code.length > 0 && !valid;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) onJoin(code);
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="play-room-code" className="block text-amber-200/90 text-[15px] mb-2" style={SERIF}>
        {invitedTo ? 'You were invited to this room' : 'Got a room code?'}
      </label>
      <div className="relative">
        <input
          id="play-room-code"
          type="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          value={code}
          onChange={(e) => setCode(parseRoomCodeInput(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="ABC123"
          aria-invalid={showHint}
          aria-describedby="play-room-code-hint"
          className={`w-full pl-4 pr-16 py-3.5 rounded-xl border font-mono uppercase tracking-[0.3em] text-lg text-amber-50 placeholder-amber-700/50 focus:ring-2 focus:ring-amber-500/10 transition-colors ${
            showHint ? 'border-red-500/50' : invitedTo ? 'border-amber-400/70' : 'border-amber-600/40 focus:border-amber-500/70'
          }`}
          style={{ background: FIELD_BG }}
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Join room"
          className={`absolute right-1.5 top-1.5 bottom-1.5 w-12 rounded-lg flex items-center justify-center text-[#1a1510] transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed ${
            valid ? 'hover:brightness-110' : 'opacity-50'
          }`}
          style={{ background: GOLD }}
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
      {showHint ? (
        <p id="play-room-code-hint" role="alert" className="mt-2 text-xs text-red-300/90" style={SERIF}>
          Room codes have {ROOM_CODE_MIN} to {ROOM_CODE_MAX} letters or digits. Invite links work too.
        </p>
      ) : null}
    </form>
  );
}

function ActionTile({
  icon,
  title,
  hint,
  featured = false,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  featured?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left p-3.5 rounded-xl border transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
        featured ? 'border-amber-500/50 bg-amber-700/15 hover:bg-amber-700/25 hover:border-amber-400/70' : 'border-amber-700/40 hover:bg-amber-900/25 hover:border-amber-600/60'
      }`}
      style={featured ? SERIF : { background: 'color-mix(in srgb, var(--surface) 55%, transparent)', ...SERIF }}
    >
      <Corners />
      <span className={`block mb-2 ${featured ? 'text-amber-300' : 'text-amber-400/80'}`}>{icon}</span>
      <span className="block text-amber-100">{title}</span>
      <span className="block text-amber-500/70 text-xs mt-0.5">{hint}</span>
    </button>
  );
}

/**
 * The landing page's play panel, code first: who you are, the room code field, then quick play
 * and create. Actions stay clickable without a name so a click can point at the missing field.
 */
export function PlayCard({ identity, validation, canPlay, isLoading, pendingRoomId, onQuickJoin, onJoinByCode, onCreateRoom }: PlayCardProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [action, setAction] = useState<PlayAction | null>(null);
  const [nameRequested, setNameRequested] = useState(false);
  const busy = isLoading && action !== null;
  const showRequired = nameRequested && !identity.name.trim();

  const run = (next: PlayAction, fn: () => void) => {
    if (identity.accountStatus === 'loading') return;
    if (!canPlay) {
      setNameRequested(true);
      queueMicrotask(() => nameInputRef.current?.focus());
      return;
    }
    setAction(next);
    fn();
  };

  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      aria-label="Play"
    >
      <div
        className="relative rounded-2xl border border-amber-700/30 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 95%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 15%) 98%, transparent) 100%)',
          boxShadow: '0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 8%, transparent)',
        }}
      >
        <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />

        <div className="p-4 sm:p-5 space-y-5">
          <Identity identity={identity} validation={validation} showRequired={showRequired} inputRef={nameInputRef} />

          <JoinByCodeForm
            key={pendingRoomId ?? ''}
            busy={busy && action === 'code'}
            disabled={isLoading}
            initialCode={pendingRoomId ?? ''}
            invitedTo={pendingRoomId}
            onJoin={(roomId) => run('code', () => onJoinByCode(roomId))}
          />

          <div className="flex items-center gap-3" aria-hidden>
            <div className="flex-1 h-px bg-amber-700/25" />
            <span className="text-amber-600/50 text-xs" style={SERIF}>or start a game</span>
            <div className="flex-1 h-px bg-amber-700/25" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ActionTile
              featured
              icon={busy && action === 'quick' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" fill="currentColor" />}
              title="Quick play"
              hint="Public table, starts fast"
              disabled={isLoading}
              onClick={() => run('quick', onQuickJoin)}
            />
            <ActionTile
              icon={<Settings2 className="w-5 h-5" />}
              title="Create room"
              hint="Your rules, invite friends"
              disabled={isLoading}
              onClick={() => run('create', onCreateRoom)}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
