'use client';

import Link from 'next/link';
import { Bot } from 'lucide-react';

import { publicProfilePath } from '../account/public/public-profile-links';

const INITIAL_FALLBACK = '?';

/** Round initial badge (tournament views carry names, not avatars). */
export function PlayerMonogram({ name, isBot = false, highlight = false, size = 'md' }: { name: string; isBot?: boolean; highlight?: boolean; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <span
      aria-hidden
      className={`font-serif inline-flex shrink-0 items-center justify-center rounded-full border ${box} ${highlight ? 'border-amber-400/70 text-amber-100 bg-amber-800/50' : 'border-amber-800/50 text-amber-300/80 bg-black/30'}`}
    >
      {isBot ? <Bot className="w-3.5 h-3.5" /> : (name.trim()[0] ?? INITIAL_FALLBACK).toUpperCase()}
    </span>
  );
}

/** A player's name, linked to their public profile when they have a handle. */
export function PlayerName({ displayName, username, isViewer = false, className = '' }: { displayName: string; username: string | null; isViewer?: boolean; className?: string }) {
  const label = (
    <>
      <span className="truncate">{displayName}</span>
      {isViewer ? <span className="shrink-0 text-[10px] uppercase tracking-wider text-amber-400/80">you</span> : null}
    </>
  );
  const classes = `inline-flex min-w-0 items-center gap-1.5 ${isViewer ? 'text-amber-100' : 'text-amber-50/90'} ${className}`;
  if (!username) return <span className={`${classes} font-serif`}>{label}</span>;
  return (
    <Link href={publicProfilePath(username)} className={`font-serif ${classes} hover:text-white hover:underline underline-offset-2`}>
      {label}
    </Link>
  );
}
