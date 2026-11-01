'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';

import { useAccount } from '@/presentation/providers/AccountProvider';

import { PlayerAvatar } from './PlayerAvatar';
import { SERIF } from './ui';

/** A segment of the start page's top-right dock (HallDock): borderless, its hover a soft pill. */
const SEGMENT_CLASS = 'inline-flex items-center gap-2 h-11 rounded-full transition-colors';

/** The signed-in segment's shape while the account loads (avatar, name, level), so nothing jumps when it arrives. */
function AccountSkeleton() {
  return (
    <span className={`${SEGMENT_CLASS} pl-1 pr-3.5`} aria-hidden>
      <span className="w-8 h-8 rounded-full bg-amber-900/40 animate-pulse" />
      <span className="flex flex-col gap-1.5">
        <span className="w-16 h-2.5 rounded-full bg-amber-900/40 animate-pulse" />
        <span className="w-10 h-2 rounded-full bg-amber-900/30 animate-pulse" />
      </span>
    </span>
  );
}

/** Top-right entry point: "Sign in" for guests, avatar, name and level for players. */
export function AccountButton({ className = '' }: { className?: string }) {
  const { status, user, overview } = useAccount();

  if (status === 'loading') return <AccountSkeleton />;

  if (status === 'guest') {
    return (
      <Link
        href="/sign-in"
        className={`${SEGMENT_CLASS} px-4 border border-amber-500/45 bg-amber-500/10 text-sm text-amber-100 hover:bg-amber-500/20 hover:border-amber-400/70 ${className}`}
        style={SERIF}
      >
        <LogIn className="w-4 h-4" aria-hidden />
        Sign in
      </Link>
    );
  }

  const level = overview?.progression.level;
  return (
    <Link href="/account" aria-label="Your account" className={`${SEGMENT_CLASS} pl-1 pr-3.5 hover:bg-amber-900/35 ${className}`}>
      <PlayerAvatar size="sm" level={level} />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-amber-100 text-sm max-w-[7rem] sm:max-w-[9rem] truncate" style={SERIF}>
          {user?.displayUsername ?? '…'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-amber-500/75">{level ? `Level ${level}` : 'Account'}</span>
      </span>
    </Link>
  );
}
