'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  NAME_SCORE_LEFT_CLASS,
  NAME_SCORE_TEXT_CLASS,
  NAME_SCORE_VALUE_CLASS,
  WINNER_NAME_LINE_CLASS,
  getNameScoreValueStyle,
} from '@/presentation/components/name-score-layout';
import { SITE_HOST } from '@/config/deployment.config';
import { SeasonalCorner, SeasonalDivider } from '@/presentation/components/seasonal';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ShareData {
  players: { name: string; score: number; perfect: number }[];
  rounds: number;
  code?: string;
}

function decodeShareData(encoded: string | null): ShareData | null {
  if (!encoded) return null;
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getMedalIcon(position: number): string {
  if (position === 0) return 'ra-crown';
  if (position === 1) return 'ra-gem-pendant';
  if (position === 2) return 'ra-gem-pendant';
  return 'ra-player';
}

function getMedalColor(position: number): string {
  if (position === 0) return '#ffd700';
  if (position === 1) return '#c0c0c0';
  if (position === 2) return '#cd7f32';
  return '#6b5a42';
}

/** No results found state */
function NoResultsFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center p-8 rounded-xl max-w-md" style={{ background: 'var(--surface)', border: '2px solid var(--surface-border)' }}>
        <i className="ra ra-scroll-unfurled text-5xl mb-4" style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-amber-100)', fontFamily: 'Georgia, serif' }}>No Results Found</h1>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>This share link appears to be invalid or expired.</p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all" style={{ background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)', color: '#1a1510' }}>
          <i className="ra ra-sword" />Play Wizard Party
        </Link>
      </div>
    </div>
  );
}

/** Single player entry in the leaderboard */
function PlayerEntry({ player, index }: { player: { name: string; score: number; perfect: number }; index: number }) {
  const isWinner = index === 0;
  return (
    <div
      className="flex items-center justify-between gap-3 min-w-0 p-3 rounded-lg"
      style={{
        background: isWinner ? 'linear-gradient(90deg, color-mix(in srgb, var(--accent-bright) 15%, transparent) 0%, color-mix(in srgb, var(--accent) 5%, transparent) 100%)' : 'color-mix(in srgb, var(--surface-border) 40%, transparent)',
        border: isWinner ? '2px solid color-mix(in srgb, var(--accent-bright) 40%, transparent)' : '1px solid var(--surface-border)',
      }}
    >
      <div className={`${NAME_SCORE_LEFT_CLASS} gap-3`}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: THEME_SURFACE.MODAL_BG, border: `2px solid ${getMedalColor(index)}`, boxShadow: isWinner ? '0 0 12px color-mix(in srgb, var(--accent-bright) 40%, transparent)' : 'none' }}>
          <i className={`ra ${getMedalIcon(index)} text-lg`} style={{ color: getMedalColor(index) }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-semibold ${NAME_SCORE_TEXT_CLASS}`} style={{ color: isWinner ? 'var(--accent-bright)' : 'var(--color-amber-100)', fontFamily: 'Georgia, serif' }}>{player.name}</div>
          <div className="text-xs" style={{ color: 'var(--accent-dim)' }}>{player.perfect} perfect bids</div>
        </div>
      </div>
      <div className={`px-3 py-1.5 rounded-lg font-bold text-xl ${NAME_SCORE_VALUE_CLASS}`} style={{ ...getNameScoreValueStyle(1, [player.score], 44), background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-dim), black 30%)', color: isWinner ? 'var(--accent-bright)' : 'var(--accent)', fontFamily: 'Georgia, serif' }}>
        {player.score}
      </div>
    </div>
  );
}

/** Room code display */
function RoomCodeDisplay({ code }: { code: string }) {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-center gap-3 p-3 rounded-lg" style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid var(--surface-border)' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'Georgia, serif' }}>Room Code:</span>
        <span className="font-mono font-bold text-xl tracking-widest" style={{ color: 'var(--accent-bright)' }}>{code}</span>
      </div>
    </div>
  );
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

function ShareContent() {
  const searchParams = useSearchParams();
  const data = decodeShareData(searchParams.get('d'));

  if (!data) return <NoResultsFound />;

  const sortedPlayers = [...data.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '3px solid var(--surface-border)', boxShadow: '0 0 24px var(--glow), 0 8px 32px rgba(0,0,0,0.5)' }}>
        {/* Decorative top border */}
        <div className="h-1.5" style={{ background: THEME_SURFACE.STRIP_TOP }} />

        <CornerOrnaments />

        {/* Header */}
        <div className="text-center px-6 pt-8 pb-4">
          <div className="flex justify-center items-center gap-3 mb-2 min-w-0">
            <i className="ra ra-trophy text-4xl flex-shrink-0" style={{ color: 'var(--accent-bright)' }} />
            <h1 className="text-3xl font-bold min-w-0" style={{ color: 'var(--color-amber-100)', fontFamily: 'Georgia, serif' }}>
              <span className={WINNER_NAME_LINE_CLASS} title={winner.name}>{winner.name}</span>
              <span className="block text-2xl">Wins!</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontFamily: 'Georgia, serif' }}>{data.rounds} Rounds of Wizard Party</p>
        </div>

        <SeasonalDivider className="px-6 pb-4" />

        {/* Leaderboard */}
        <div className="px-4 pb-4 space-y-2">
          {sortedPlayers.map((player, index) => (
            <PlayerEntry key={`player-${player.name}-${player.score}`} player={player} index={index} />
          ))}
        </div>

        {data.code ? <RoomCodeDisplay code={data.code} /> : null}

        {/* CTA */}
        <div className="px-4 pb-6">
          <Link href="/" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold transition-all" style={{ background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)', border: '1px solid var(--accent-bright)', color: '#1a1510', boxShadow: '0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)' }}>
            <i className="ra ra-sword" />Play Wizard Party
          </Link>
        </div>

        {/* Decorative bottom border */}
        <div className="h-1" style={{ background: THEME_SURFACE.STRIP_BOTTOM }} />
      </div>

      <p className="mt-6 text-sm" style={{ color: 'var(--accent-dim)' }}>{SITE_HOST}</p>
    </div>
  );
}

export function ShareClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
          <i className="ra ra-cycle animate-spin text-4xl" style={{ color: 'var(--accent)' }} />
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
