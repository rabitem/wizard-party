'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { useAccount } from '@/presentation/providers/AccountProvider';

import { BAR_BG } from './account-surfaces';
import { PlayerAvatar } from './PlayerAvatar';
import { SERIF } from './ui';

/** Top-right entry point: "Sign in" for guests, avatar + level for players. */
export function AccountButton({ className = '' }: { className?: string }) {
  const { status, user, overview } = useAccount();

  if (status === 'loading') {
    return <div className={`h-11 w-28 rounded-full bg-amber-900/20 animate-pulse ${className}`} aria-hidden />;
  }

  if (status === 'guest') {
    return (
      <Link
        href="/sign-in"
        className={`inline-flex items-center gap-2 h-11 px-4 rounded-full border border-amber-700/40 text-amber-200/90 hover:text-amber-50 hover:border-amber-500/60 hover:bg-amber-900/25 transition-all text-sm ${className}`}
        style={{ ...SERIF, background: BAR_BG, backdropFilter: 'blur(6px)' }}
      >
        <LogIn className="w-4 h-4" />
        Sign in
      </Link>
    );
  }

  const level = overview?.progression.level;
  return (
    <Link
      href="/account"
      aria-label="Your account"
      className={`inline-flex items-center gap-2 h-11 pl-1 pr-3.5 rounded-full border border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/25 transition-all ${className}`}
      style={{ background: BAR_BG, backdropFilter: 'blur(6px)' }}
    >
      <PlayerAvatar size="sm" level={level} />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-amber-100 text-sm max-w-[9rem] truncate" style={SERIF}>
          {user?.displayUsername ?? '…'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-amber-500/70">{level ? `Level ${level}` : 'Account'}</span>
      </span>
    </Link>
  );
}
