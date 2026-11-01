'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SITE_HOST } from '@/config/deployment.config';
import { SeasonalCorner, SeasonalDivider } from '@/presentation/components/seasonal';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface JoinClientProps {
  roomCode: string | null;
}

const CORNER_SIZE = 32;

/** Seasonal corner ornaments for the card */
function CornerOrnaments() {
  return (
    <>
      <SeasonalCorner position="top-left" size={CORNER_SIZE} />
      <SeasonalCorner position="top-right" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-left" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-right" size={CORNER_SIZE} />
    </>
  );
}

/** Error state when no room code is provided */
function NoRoomCodeView() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className="relative text-center p-8 rounded-xl max-w-md"
        style={{ background: 'var(--surface)', border: '2px solid var(--surface-border)' }}
      >
        <i className="ra ra-scroll-unfurled text-5xl mb-4" style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-amber-100)', fontFamily: 'Georgia, serif' }}>
          No room code found
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>
          This invite link appears to be invalid or expired.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all"
          style={{ background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)', color: '#1a1510' }}
        >
          <i className="ra ra-sword" />
          Play Wizard Party
        </Link>
      </div>
    </div>
  );
}

export function JoinClient({ roomCode }: JoinClientProps) {
  const router = useRouter();

  useEffect(() => {
    if (roomCode) {
      const timer = setTimeout(() => {
        router.push(`/?room=${roomCode}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [roomCode, router]);

  if (!roomCode) {
    return <NoRoomCodeView />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Main card */}
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '3px solid var(--surface-border)',
          boxShadow: '0 0 24px var(--glow), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Decorative top border */}
        <div
          className="h-1.5"
          style={{
            background: THEME_SURFACE.STRIP_TOP,
          }}
        />

        <CornerOrnaments />

        {/* Header */}
        <div className="text-center px-6 pt-8 pb-4">
          <div className="flex justify-center items-center gap-3 mb-2">
            <i className="ra ra-crystal-wand text-4xl" style={{ color: 'var(--accent-bright)' }} />
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--color-amber-100)', fontFamily: 'Georgia, serif' }}
            >
              Join the Game!
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Georgia, serif' }}>
            You&apos;ve been invited to play Wizard Party
          </p>
        </div>

        <SeasonalDivider className="px-6 pb-4" />

        {/* Room Code Display */}
        <div className="px-6 pb-6">
          <div
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg mb-6"
            style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '2px solid var(--surface-border)' }}
          >
            <span style={{ color: 'var(--text-muted)', fontFamily: 'Georgia, serif', fontSize: '0.875rem' }}>Room code</span>
            <span
              className="font-mono font-bold text-4xl tracking-widest"
              style={{ color: 'var(--accent-bright)' }}
            >
              {roomCode}
            </span>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-3 mb-6" style={{ color: 'var(--text-muted)' }}>
            <i className="ra ra-cycle animate-spin text-xl" style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'Georgia, serif' }}>Joining room...</span>
          </div>

          {/* Manual join button */}
          <Link
            href={`/?room=${roomCode}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold transition-all"
            style={{
              background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)',
              border: '1px solid var(--accent-bright)',
              color: '#1a1510',
              boxShadow: '0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)',
            }}
          >
            <i className="ra ra-sword" />
            Join Now
          </Link>
        </div>

        {/* Decorative bottom border */}
        <div
          className="h-1"
          style={{
            background: THEME_SURFACE.STRIP_BOTTOM,
          }}
        />
      </div>

      {/* Footer */}
      <p className="mt-6 text-sm" style={{ color: 'var(--accent-dim)' }}>
        {SITE_HOST}
      </p>
    </div>
  );
}
