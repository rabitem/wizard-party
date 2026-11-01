'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AtSign, ExternalLink } from 'lucide-react';

import { USERNAME_RULES, canChangeUsername, nextUsernameChangeAt, normalizeUsername } from '@shared/domain/account/username';

import { changeUsername } from '@/lib/account/profile-visibility-api';

import { INSET_BG } from '../account-surfaces';
import { UsernameField } from '../auth/UsernameField';
import { useUsernameAvailability, type UsernameAvailability } from '../auth/useUsernameAvailability';
import { Button, Notice, Panel, SectionHeading, errorMessage } from '../ui';
import { CopyProfileLinkButton } from './CopyProfileLinkButton';
import { publicProfilePath, publicProfileUrl } from './public-profile-links';

interface UsernamePanelProps {
  /** Stored (lowercase) name. */
  username: string;
  displayUsername: string;
  /** Last rename (ms); null until the first one. */
  changedAt: number | null;
  isPublic: boolean;
  /** Re-reads the session so the new name shows everywhere. */
  onChanged: () => Promise<void> | void;
}

const CAN_SUBMIT: ReadonlySet<UsernameAvailability['status']> = new Set(['available', 'unknown']);
const COOLDOWN_DAYS = USERNAME_RULES.CHANGE_COOLDOWN_MS / 86_400_000;
const formatDate = (time: number) => new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * The field value. The panel stays mounted across name changes (so its notice survives the
 * session refresh); a change from elsewhere (another tab or device) replaces the field only
 * while it is unedited.
 */
function useNameInput(saved: string) {
  const [value, setValue] = useState(saved);
  const [syncedFrom, setSyncedFrom] = useState(saved);
  if (saved !== syncedFrom) {
    setSyncedFrom(saved);
    if (value.trim() === syncedFrom) setValue(saved);
  }
  return [value, setValue] as const;
}

/** The account's one name: renamed at most once every 30 days, casing changes any time. */
export function UsernamePanel({ username, displayUsername, changedAt, isPublic, onChanged }: UsernamePanelProps) {
  const [value, setValue] = useNameInput(displayUsername);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const checked = useUsernameAvailability(value);
  // Read once per render from the clock; the cooldown is days long, so no ticking is needed.
  const [now] = useState(() => Date.now());

  // The submit button turns disabled after a change; move focus to the result instead of <body>.
  useEffect(() => {
    if (status) statusRef.current?.focus();
  }, [status]);

  const renaming = normalizeUsername(value) !== username;
  const unchanged = !renaming && value.trim() === displayUsername;
  const renameAllowed = canChangeUsername(changedAt, now);
  const nextChange = nextUsernameChangeAt(changedAt);
  // Your own name is "taken" by you; only casing changes are possible then.
  const availability: UsernameAvailability = renaming ? checked : { status: 'idle' };
  const canSubmit = !unchanged && (!renaming || (renameAllowed && CAN_SUBMIT.has(availability.status)));

  const edit = (next: string) => {
    setValue(next);
    setConfirming(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (renaming && !confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await changeUsername(value);
      setValue(value.trim());
      setConfirming(false);
      await onChanged();
      setStatus({ tone: 'success', text: renaming ? 'Name changed. Sign in with your new name from now on.' : 'Name saved.' });
    } catch (error) {
      setStatus({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel accent={false}>
      <form onSubmit={submit} className="p-4 sm:p-5 space-y-4">
        <SectionHeading
          icon={<AtSign className="w-4 h-4" />}
          title="Name"
          description="Your one name: you play under it, friends find you by it and you sign in with it."
        />
        <div ref={statusRef} tabIndex={-1} className="outline-none empty:hidden">
          {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        </div>
        {!renameAllowed && nextChange !== null ? (
          <Notice>You can pick a new name again on {formatDate(nextChange)}. Changing upper and lower case is always possible.</Notice>
        ) : null}
        <UsernameField id="account-username" value={value} onChange={edit} availability={availability} />
        {renaming && renameAllowed && !confirming ? (
          <p className="text-xs text-amber-300/70 font-serif">
            Links to <span className="text-amber-200">{publicProfilePath(username)}</span> will stop working.
          </p>
        ) : null}
        {confirming ? (
          <Notice tone="warning">
            Rename to <strong>{value.trim()}</strong>? Old links to your profile stop working and others can take your old name. Next rename in{' '}
            {COOLDOWN_DAYS} days.
          </Notice>
        ) : null}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {confirming ? (
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
          ) : null}
          <Button type="submit" variant="primary" loading={busy} disabled={!canSubmit} className="w-full sm:w-auto">
            {confirming ? 'Confirm new name' : 'Save name'}
          </Button>
        </div>

        <div className="rounded-xl border border-amber-800/30 p-3 sm:p-4 space-y-3" style={{ background: INSET_BG }}>
          <div className="text-[11px] uppercase tracking-wider text-amber-400/70 font-serif">
            Your public profile
          </div>
          <div className="text-sm text-amber-100 break-all font-serif">
            {publicProfileUrl(username)}
          </div>
          {!isPublic ? <p className="text-xs text-amber-300/60">Your profile is private, so this link shows nothing until you make it public below.</p> : null}
          <div className="flex flex-col sm:flex-row gap-2">
            <CopyProfileLinkButton url={publicProfileUrl(username)} className="w-full sm:w-auto" />
            <a
              href={publicProfilePath(username)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 min-h-11 text-sm transition-all w-full sm:w-auto border border-transparent text-amber-300/80 hover:text-amber-100 hover:bg-amber-900/20 font-serif"
            >
              <ExternalLink className="w-4 h-4" aria-hidden />
              Open profile
            </a>
          </div>
        </div>
      </form>
    </Panel>
  );
}
