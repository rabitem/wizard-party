'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';

import { PRESENCE_MODES, type PresenceMode } from '@shared/domain/social';

import { socialApi } from '@/lib/social/social-api';
import { useAccount } from '@/presentation/providers/AccountProvider';
import { useSocial } from '@/presentation/providers/SocialProvider';

import { errorMessage } from '../account/ui';
import { PresenceAvatar } from './PresenceAvatar';
import { MODE_COLORS, MODE_LABELS } from './social-format';

const MODE_STATUS = { online: 'online', away: 'away', busy: 'busy', invisible: 'offline' } as const;

/** The player's own card in the panel header, with a LoL-style status menu. */
export function StatusPicker() {
  const { user, overview } = useAccount();
  const { mode, refresh } = useSocial();
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<PresenceMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = optimistic ?? mode;

  const choose = async (next: PresenceMode) => {
    setOpen(false);
    setOptimistic(next);
    setError(null);
    try {
      await socialApi.updateSettings({ presenceMode: next });
      refresh();
      // The next pulse reports the stored mode; until then keep showing the choice.
      setTimeout(() => setOptimistic(null), 4000);
    } catch (cause) {
      setOptimistic(null);
      setError(errorMessage(cause));
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex items-center gap-3 w-full rounded-xl px-2 py-1.5 hover:bg-amber-900/20 transition-colors cursor-pointer text-left">
        <PresenceAvatar avatarId={undefined} level={overview?.progression.level ?? 1} status={MODE_STATUS[current]} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-amber-50 font-serif">{user?.displayUsername ?? '…'}</span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: MODE_COLORS[current] }}>
            {MODE_LABELS[current].label}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </span>
      </button>
      {error ? <p role="alert" className="mt-1 px-2 text-xs text-red-300/90">{error}</p> : null}
      <AnimatePresence>
        {open ? (
          <motion.ul initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-amber-700/40 p-1 shadow-2xl" style={{ background: 'color-mix(in srgb, var(--surface), black 5%)' }} role="menu">
            {PRESENCE_MODES.map((option) => (
              <li key={option}>
                <button type="button" role="menuitemradio" aria-checked={option === current} onClick={() => void choose(option)} className={`w-full flex items-start gap-2.5 rounded-lg px-3 py-2 text-left cursor-pointer hover:bg-amber-900/30 ${option === current ? 'bg-amber-900/25' : ''}`}>
                  <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: MODE_COLORS[option] }} />
                  <span>
                    <span className="block text-sm text-amber-100 font-serif">{MODE_LABELS[option].label}</span>
                    <span className="block text-[11px] text-amber-200/45">{MODE_LABELS[option].description}</span>
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
