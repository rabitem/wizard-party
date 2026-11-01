'use client';

import type { ReactNode } from 'react';

import type { AuthProviderId } from '@/infrastructure/auth/auth-capabilities';

import { Button } from './ui';

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
  </svg>
);

const DiscordIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#8B9CFF" aria-hidden>
    <path d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.24.48c1.8.44 2.64 1.07 3.5 1.84a12.6 12.6 0 0 0-11.32 0c.86-.77 1.84-1.46 3.5-1.84L10.6 3a19.6 19.6 0 0 0-4.9 1.4C2.6 9 1.76 13.5 2.18 17.94A19.8 19.8 0 0 0 8.2 21l.74-1.2a12.4 12.4 0 0 1-2.04-1l.5-.38a14.1 14.1 0 0 0 9.2 0l.5.38c-.64.38-1.32.72-2.04 1l.74 1.2a19.7 19.7 0 0 0 6.02-3.06c.5-5.14-.84-9.6-3.52-13.54zM9.1 15.2c-1.08 0-1.96-1-1.96-2.2 0-1.22.86-2.2 1.96-2.2s1.98 1 1.96 2.2c0 1.2-.86 2.2-1.96 2.2zm5.8 0c-1.08 0-1.96-1-1.96-2.2 0-1.22.86-2.2 1.96-2.2s1.98 1 1.96 2.2c0 1.2-.86 2.2-1.96 2.2z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#f2e6d0" aria-hidden>
    <path d="M12 2.2a10 10 0 0 0-3.16 19.48c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.59.69.48A10 10 0 0 0 12 2.2z" />
  </svg>
);

export const PROVIDER_META: Record<AuthProviderId, { label: string; icon: ReactNode }> = {
  google: { label: 'Google', icon: <GoogleIcon /> },
  discord: { label: 'Discord', icon: <DiscordIcon /> },
  github: { label: 'GitHub', icon: <GitHubIcon /> },
};

// Literal class names so Tailwind generates them.
const GRID_COLUMNS: Record<number, string> = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

interface ProviderButtonsProps {
  providers: AuthProviderId[];
  pending: string | null;
  lastUsed?: string | null;
  onSelect: (provider: AuthProviderId) => void;
}

export function ProviderButtons({ providers, pending, lastUsed, onSelect }: ProviderButtonsProps) {
  if (providers.length === 0) return null;
  return (
    <div className={`grid gap-2.5 ${GRID_COLUMNS[Math.min(providers.length, 3)]}`}>
      {providers.map((provider) => (
        <Button
          key={provider}
          type="button"
          block
          icon={PROVIDER_META[provider].icon}
          loading={pending === provider}
          disabled={pending !== null}
          onClick={() => onSelect(provider)}
          className="relative"
        >
          {PROVIDER_META[provider].label}
          {lastUsed === provider ? (
            <span className="absolute -top-2 right-2 rounded-full bg-amber-600 px-1.5 py-px text-[9px] uppercase tracking-wider text-amber-950">
              Last used
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
