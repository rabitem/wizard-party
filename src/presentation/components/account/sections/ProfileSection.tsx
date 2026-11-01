'use client';

import { useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Quote, Sparkles } from 'lucide-react';

import { ACCOUNT_LIMITS } from '@shared/domain/account';

import { accountApi, type AccountOverviewDto } from '@/lib/account/account-api';
import { useAccount, type AccountUser } from '@/presentation/providers/AccountProvider';

import { PlayerAvatar } from '../PlayerAvatar';
import { ProfileVisibilityPanel } from '../public/ProfileVisibilityPanel';
import { UsernamePanel } from '../public/UsernamePanel';
import { BlockedPlayersPanel, SocialSettingsPanel } from '../../friends';
import { EmailVerification } from './EmailVerification';
import { Button, Field, Notice, Panel, SectionHeading, errorMessage } from '../ui';

const PROFILE_ERRORS: Record<string, string> = {
  tagline_length: `Taglines can have up to ${ACCOUNT_LIMITS.TAGLINE_MAX_LENGTH} characters.`,
};

type Status = { tone: 'success' | 'error'; text: string } | null;

function TaglinePanel({ overview, onSaved }: { overview: AccountOverviewDto; onSaved: () => void }) {
  const [tagline, setTagline] = useState(overview.profile.tagline);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await accountApi.updateProfile({ tagline });
      setStatus({ tone: 'success', text: 'Tagline saved.' });
      onSaved();
    } catch (error) {
      const message = errorMessage(error);
      setStatus({ tone: 'error', text: PROFILE_ERRORS[message] ?? message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel accent={false}>
      <form onSubmit={save} className="p-4 sm:p-5 space-y-4">
        <SectionHeading icon={<Quote className="w-4 h-4" />} title="Tagline" description="A line under your name on your profile." />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <Field
          label="Tagline"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
          maxLength={ACCOUNT_LIMITS.TAGLINE_MAX_LENGTH}
          placeholder="I always bid zero."
          hint={`${tagline.length}/${ACCOUNT_LIMITS.TAGLINE_MAX_LENGTH}`}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={busy} disabled={tagline === overview.profile.tagline}>Save tagline</Button>
        </div>
      </form>
    </Panel>
  );
}

/** The look is edited on the Character tab; the profile shows it and points there. */
function CharacterPanel() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 flex items-center gap-4">
        <PlayerAvatar size="lg" label="Your character" />
        <div className="min-w-0 flex-1">
          <SectionHeading title="Character" description="Your look at the table, in the lobby and on your profile." />
        </div>
        <Button icon={<Sparkles className="w-4 h-4" />} onClick={() => router.replace(`${pathname}?tab=character`, { scroll: false })}>Edit</Button>
      </div>
    </Panel>
  );
}

function EmailPanel({ user, onVerified }: { user: AccountUser; onVerified: () => Promise<void> }) {
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading title="Email" />
        <EmailVerification email={user.email} verified={user.emailVerified} onVerified={onVerified} />
      </div>
    </Panel>
  );
}

const toTime = (value: string | Date | null | undefined) => (value ? new Date(value).getTime() : null);

export function ProfileSection({ overview, onSaved }: { overview: AccountOverviewDto; onSaved: () => void }) {
  const { user, refreshSession } = useAccount();
  const { isPublic, showHistory } = overview.profile;

  return (
    <div className="space-y-4 sm:space-y-5">
      {user ? (
        <UsernamePanel
          username={user.username}
          displayUsername={user.displayUsername}
          changedAt={toTime(user.usernameChangedAt)}
          isPublic={isPublic}
          onChanged={refreshSession}
        />
      ) : null}
      <TaglinePanel overview={overview} onSaved={onSaved} />
      {user ? <ProfileVisibilityPanel initial={{ isPublic, showHistory }} onSaved={onSaved} /> : null}
      {user ? <SocialSettingsPanel /> : null}
      <CharacterPanel />
      {user ? <EmailPanel user={user} onVerified={refreshSession} /> : null}
      {user ? <BlockedPlayersPanel /> : null}
    </div>
  );
}
