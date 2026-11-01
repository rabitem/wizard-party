'use client';

import { useState, type FormEvent } from 'react';
import { Quote } from 'lucide-react';

import { ACCOUNT_LIMITS } from '@shared/domain/account';

import { accountApi, type AccountOverviewDto } from '@/lib/account/account-api';
import { AVATAR_PRESETS, loadGameSettings, saveGameSettings } from '@/presentation/components/settings';
import { useAccount, type AccountUser } from '@/presentation/providers/AccountProvider';

import { useAvatarId } from '../PlayerAvatar';
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

function AvatarPanel() {
  const avatarId = useAvatarId();
  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5">
        <SectionHeading title="Avatar" description="Saved instantly and synced to all your devices." />
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
          {AVATAR_PRESETS.map((avatar) => {
            const selected = avatar.id === avatarId;
            return (
              <button
                key={avatar.id}
                type="button"
                title={avatar.label}
                aria-label={avatar.label}
                aria-pressed={selected}
                onClick={() => saveGameSettings({ ...loadGameSettings(), avatar: avatar.id })}
                className={`aspect-square rounded-xl border-2 inline-flex items-center justify-center text-xl sm:text-2xl transition-all cursor-pointer ${selected ? 'border-amber-500/80 text-amber-300 bg-amber-900/40 shadow-[0_0_16px_color-mix(in_srgb,var(--glow)_70%,transparent)]' : 'border-amber-900/40 text-amber-200/50 hover:border-amber-700/60 hover:text-amber-200'}`}
              >
                <i className={`ra ${avatar.icon}`} aria-hidden />
              </button>
            );
          })}
        </div>
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
      <AvatarPanel />
      {user ? <EmailPanel user={user} onVerified={refreshSession} /> : null}
      {user ? <BlockedPlayersPanel /> : null}
    </div>
  );
}
