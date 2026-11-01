'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

import { PRESENCE_MODES, type InvitePolicy, type SocialSettings, type SocialSettingsChanges } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { Notice, Panel, SERIF, SectionHeading, Toggle, errorMessage } from '../../account/ui';
import { MODE_COLORS, MODE_LABELS } from '../social-format';
import { CommunicationSettings } from './CommunicationSettings';

const INVITE_OPTIONS: { value: InvitePolicy; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'nobody', label: 'Nobody' },
];

function Segmented<T extends string>({ value, options, onChange, disabled }: { value: T; options: { value: T; label: string; color?: string }[]; onChange: (value: T) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button key={option.value} type="button" role="radio" aria-checked={option.value === value} disabled={disabled} onClick={() => onChange(option.value)} className={`min-h-11 px-2 rounded-xl border text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 ${option.value === value ? 'border-amber-500/70 bg-amber-900/40 text-amber-50' : 'border-amber-900/40 text-amber-200/60 hover:text-amber-100'}`} style={SERIF}>
          {option.color ? <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: option.color }} /> : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Account → Profile: who may invite or befriend me, my online status and invite emails. */
export function SocialSettingsPanel() {
  const { refresh } = useSocial();
  const [settings, setSettings] = useState<SocialSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socialApi.settings().then(setSettings, (cause: unknown) => setError(errorMessage(cause)));
  }, []);

  // Optimistic: apply at once, roll back if the server refuses.
  const change = async (changes: SocialSettingsChanges) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...changes });
    setSaving(true);
    setError(null);
    try {
      setSettings(await socialApi.updateSettings(changes));
      refresh();
    } catch (cause) {
      setSettings(previous);
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel accent={false}>
      <div className="p-4 sm:p-5 space-y-4">
        <SectionHeading icon={<Users className="w-4 h-4" />} title="Friends & invites" description="Control who can reach you and how you appear to friends." />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {!settings ? <div className="h-40 rounded-xl bg-amber-900/10 animate-pulse" /> : (
          <>
            <div className="space-y-2">
              <p className="text-sm text-amber-100" style={SERIF}>Online status</p>
              <Segmented value={settings.presenceMode} disabled={saving} onChange={(presenceMode) => void change({ presenceMode })} options={PRESENCE_MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode].label, color: MODE_COLORS[mode] }))} />
              <p className="text-xs text-amber-200/45">{MODE_LABELS[settings.presenceMode].description}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-amber-100" style={SERIF}>Game invites from</p>
              <Segmented value={settings.invitePolicy} disabled={saving} onChange={(invitePolicy) => void change({ invitePolicy })} options={INVITE_OPTIONS} />
              <p className="text-xs text-amber-200/45">Choose &ldquo;Friends only&rdquo; to stop invites from players you don&apos;t know.</p>
            </div>
            <Toggle label="Allow friend requests" description="When off, nobody can send you new requests. You can still add others." checked={settings.friendRequestPolicy === 'everyone'} disabled={saving} onChange={(on) => void change({ friendRequestPolicy: on ? 'everyone' : 'nobody' })} />
            <CommunicationSettings settings={settings} saving={saving} onChange={(changes) => void change(changes)} />
          </>
        )}
      </div>
    </Panel>
  );
}
