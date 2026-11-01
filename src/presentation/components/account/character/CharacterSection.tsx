'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { RotateCcw, Sparkles } from 'lucide-react';
import { withPart, type CharacterAppearance, type CharacterSlot } from '@shared/domain/character';

import { accountApi } from '@/lib/account/account-api';
import { rememberSavedAppearance } from '@/presentation/hooks/account/useLocalAppearance';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { Button, Notice, Panel, SectionHeading, errorMessage } from '../ui';
import { EDITOR_SLOTS, SAVE_ERRORS, adjustedSlots, isDirty, partOptions } from './character-editor';
import { PartPicker } from './PartPicker';

// three.js loads only when the Character tab opens.
const CharacterPreview = dynamic(() => import('./CharacterPreview'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-amber-900/10" />,
});

type Status = { tone: 'success' | 'error' | 'info'; text: string } | null;

interface Loaded {
  saved: CharacterAppearance;
  /** False while the look is still derived from the old avatar: saving it keeps it. */
  stored: boolean;
  unlocked: ReadonlySet<string>;
}

const SLOT_NAMES = new Map(EDITOR_SLOTS.map((entry) => [entry.slot, entry.label.toLowerCase()]));

function fitNotice(slots: CharacterSlot[]): Status {
  if (slots.length === 0) return null;
  return { tone: 'info', text: `Changed to fit: ${slots.map((slot) => SLOT_NAMES.get(slot)).join(', ')}.` };
}

/** The Character tab: pick parts, see the figure turn in 3D, save to the account. */
export function CharacterSection() {
  const { user } = useAccount();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<CharacterAppearance | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [celebration, setCelebration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    accountApi.character().then(
      (view) => {
        if (cancelled) return;
        setLoaded({ saved: view.appearance, stored: view.saved, unlocked: new Set(view.unlockedPartIds) });
        setDraft(view.appearance);
      },
      (error) => !cancelled && setStatus({ tone: 'error', text: errorMessage(error) })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () => (loaded && draft ? EDITOR_SLOTS.map((entry) => ({ ...entry, options: partOptions(entry.slot, draft, loaded.unlocked) })) : []),
    [loaded, draft]
  );

  if (!loaded || !draft) {
    return status ? <Notice tone="error">{status.text}</Notice> : <div className="h-96 rounded-2xl bg-amber-900/10 animate-pulse" aria-busy />;
  }

  const dirty = isDirty(draft, loaded.saved);

  const pick = (partId: string) => {
    const next = withPart(draft, partId);
    setDraft(next);
    setStatus(fitNotice(adjustedSlots(draft, next, partId)));
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setStatus(null);
    try {
      const view = await accountApi.saveCharacter(draft);
      setLoaded({ saved: view.appearance, stored: true, unlocked: new Set(view.unlockedPartIds) });
      setDraft(view.appearance);
      rememberSavedAppearance(user.id, view.appearance);
      setCelebration((count) => count + 1);
      setStatus({ tone: 'success', text: 'Character saved. Every table you join shows this look.' });
    } catch (error) {
      const message = errorMessage(error);
      setStatus({ tone: 'error', text: SAVE_ERRORS[message] ?? message });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDraft(loaded.saved);
    setStatus(null);
  };

  return (
    <Panel>
      <div className="p-4 sm:p-5">
        <SectionHeading
          icon={<Sparkles className="w-4 h-4" />}
          title="Character"
          description="How you appear at the table, in the lobby and on your profile. Levels and achievements unlock more parts."
        />
        <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="md:sticky md:top-4 self-start">
            <div className="h-72 sm:h-96 rounded-xl border border-amber-900/40 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--glow)_25%,transparent),transparent_70%)]">
              <CharacterPreview appearance={draft} celebration={celebration} />
            </div>
            <p className="mt-2 text-center text-xs text-amber-200/40">Drag to turn your character.</p>
          </div>
          <div className="space-y-5">
            {options.map((entry) => (
              <PartPicker key={entry.slot} label={entry.label} options={entry.options} swatches={entry.slot === 'palette'} onPick={pick} />
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" icon={<RotateCcw className="w-4 h-4" />} onClick={reset} disabled={!dirty || busy}>Undo changes</Button>
            <Button variant="primary" loading={busy} onClick={save} disabled={!dirty && loaded.stored}>Save character</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
