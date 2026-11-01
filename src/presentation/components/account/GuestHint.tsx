'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { CloudOff, X } from 'lucide-react';

import { safeSessionStorage } from '@/lib/storage';
import { useAccount } from '@/presentation/providers/AccountProvider';

import { SERIF } from './ui';

const DISMISS_KEY = 'wizard-party-guest-hint-dismissed';

function wasDismissed(): boolean {
  return safeSessionStorage.getItem(DISMISS_KEY) === '1';
}

/**
 * Tells guests that their progress only lives in this browser. Dismissing hides it for the
 * current browser session only, because the risk stays.
 */
export function GuestHint({ variant = 'banner', className = '' }: { variant?: 'banner' | 'inline'; className?: string }) {
  const { status } = useAccount();
  const [dismissed, setDismissed] = useState(() => typeof window !== 'undefined' && variant === 'banner' && wasDismissed());

  if (status !== 'guest' || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    safeSessionStorage.setItem(DISMISS_KEY, '1');
  };

  return (
    <motion.aside
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-start gap-3 rounded-xl border border-amber-600/25 px-3.5 py-3 ${className}`}
      style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-900) 35%, transparent) 0%, color-mix(in srgb, var(--surface) 35%, transparent) 100%)' }}
      aria-label="Playing as guest"
    >
      <CloudOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-400/70" />
      <p className="text-xs sm:text-[13px] text-amber-200/70 leading-relaxed pr-6" style={SERIF}>
        <span className="text-amber-200/95">Playing as a guest.</span> Your stats, rewards and settings are only kept in this browser
        and may be lost when you clear it or switch devices.{' '}
        <Link href="/sign-in?mode=sign-up" className="text-amber-400 underline decoration-amber-600/50 underline-offset-2 hover:text-amber-300">
          Create a free account
        </Link>{' '}
        to keep them.
      </p>
      {variant === 'banner' ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 w-8 h-8 inline-flex items-center justify-center rounded-lg text-amber-600/60 hover:text-amber-300 hover:bg-amber-900/30 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </motion.aside>
  );
}
