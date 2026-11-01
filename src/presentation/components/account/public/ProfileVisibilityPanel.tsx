'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';

import { updateProfileVisibility, type ProfileVisibilityChanges } from '@/lib/account/profile-visibility-api';

import { Notice, Panel, SectionHeading, Toggle, errorMessage } from '../ui';

interface Visibility {
  isPublic: boolean;
  showHistory: boolean;
}

/** Who can see the public profile, and whether recent games are part of it. */
export function ProfileVisibilityPanel({ initial, onSaved }: { initial: Visibility; onSaved: () => void }) {
  const [visibility, setVisibility] = useState<Visibility>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optimistic: flip immediately, roll back if the server refuses.
  const change = async (changes: ProfileVisibilityChanges) => {
    const previous = visibility;
    setVisibility({ ...visibility, ...changes });
    setSaving(true);
    setError(null);
    try {
      const profile = await updateProfileVisibility(changes);
      setVisibility({ isPublic: profile.isPublic, showHistory: profile.showHistory });
      onSaved();
    } catch (cause) {
      setVisibility(previous);
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-3">
        <SectionHeading
          icon={<Eye className="w-4 h-4" />}
          title="Privacy"
          description="Your email is never shown. Pinned games always appear on a public profile."
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Toggle
          label="Public profile"
          description="Anyone with the link can see your level, stats, achievements and pinned games."
          checked={visibility.isPublic}
          disabled={saving}
          onChange={(isPublic) => void change({ isPublic })}
        />
        <Toggle
          label="Show recent games on my profile"
          description="Lists your last 10 games with placement and score."
          checked={visibility.showHistory}
          disabled={saving || !visibility.isPublic}
          onChange={(showHistory) => void change({ showHistory })}
        />
        <p className="text-[11px] text-amber-300/40">Changes can take up to a minute to appear on your public page.</p>
      </div>
    </Panel>
  );
}
