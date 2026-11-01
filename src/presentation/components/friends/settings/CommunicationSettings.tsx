'use client';

import { Mail } from 'lucide-react';

import type { SocialSettings, SocialSettingsChanges } from '@shared/domain/social';

import { useAuthCapabilities } from '@/presentation/hooks/account/useAuthCapabilities';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { EmailVerification } from '../../account/sections/EmailVerification';
import { Notice, SectionHeading, Toggle } from '../../account/ui';

interface CommunicationSettingsProps {
  settings: SocialSettings;
  saving: boolean;
  onChange: (changes: SocialSettingsChanges) => void;
}

/**
 * Which notifications are emailed, and where to. Shows the destination address and whether it is
 * verified, because unverified addresses receive fewer emails (tighter daily budgets): players see
 * why and can verify right here.
 */
export function CommunicationSettings({ settings, saving, onChange }: CommunicationSettingsProps) {
  const { user, refreshSession } = useAccount();
  const capabilities = useAuthCapabilities();
  const mailEnabled = capabilities?.email !== false;

  return (
    <div className="pt-2 space-y-3">
      <SectionHeading icon={<Mail className="w-4 h-4" />} title="Communication" description="Every email has a one-click unsubscribe link." />
      {user ? (
        <div className="rounded-xl border border-amber-800/25 px-3 py-3" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 45%, transparent)' }}>
          <p className="mb-2 text-[11px] uppercase tracking-wider text-amber-400/60">Sent to</p>
          <EmailVerification email={user.email} verified={user.emailVerified} onVerified={refreshSession} actionLabel="Verify now" />
        </div>
      ) : null}
      {user && !user.emailVerified && mailEnabled ? (
        <Notice tone="warning">Your email isn&apos;t verified yet, so we send you fewer of these emails. Verify it above to get all of them.</Notice>
      ) : null}
      {!mailEnabled ? <Notice>Email notifications are currently unavailable. Everything still arrives in your in-game inbox.</Notice> : null}
      <Toggle
        label="Email me about game invites"
        description="When a friend invites you while you're offline. At most a few per day."
        checked={settings.emailGameInvites}
        disabled={saving}
        onChange={(emailGameInvites) => onChange({ emailGameInvites })}
      />
      <Toggle
        label="Email me about friend requests"
        description="When someone sends you a friend request while you're offline. At most a few per day."
        checked={settings.emailFriendRequests}
        disabled={saving}
        onChange={(emailFriendRequests) => onChange({ emailFriendRequests })}
      />
    </div>
  );
}
