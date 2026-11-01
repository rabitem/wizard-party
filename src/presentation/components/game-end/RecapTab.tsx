'use client';

import { IPlayer } from '@shared/domain';
import { ScoreProgressionData, PLAYER_COLORS } from './types';
import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';

interface RecapTabProps {
  players: IPlayer[];
  localPlayerId: string;
  maxRounds: number;
  scoreProgression: ScoreProgressionData[];
  maxScore: number;
}

/** Score progression chart showing each player's score over rounds */
function ScoreProgressionChart({ scoreProgression, localPlayerId, maxRounds, maxScore }: { scoreProgression: ScoreProgressionData[]; localPlayerId: string; maxRounds: number; maxScore: number }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--surface-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <i className="ra ra-scroll-unfurled text-base" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-amber-100)', fontFamily: 'var(--font-serif)' }}>Score Journey</span>
      </div>
      <div className="h-32 relative">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((i) => <div key={i} className="border-t w-full" style={{ borderColor: 'color-mix(in srgb, var(--text-muted) 20%, transparent)' }} />)}
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {scoreProgression.map((player, pIdx) => {
            const points = player.scores.map((score, i) => `${(i / maxRounds) * 100},${100 - (score / maxScore) * 100}`).join(' ');
            return <polyline key={player.playerId} points={points} fill="none" stroke={PLAYER_COLORS[pIdx % PLAYER_COLORS.length]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={player.playerId === localPlayerId ? 1 : 0.4} />;
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {scoreProgression.map((player, pIdx) => (
          <div key={player.playerId} className="flex items-center gap-1.5 min-w-0 max-w-full">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PLAYER_COLORS[pIdx % PLAYER_COLORS.length] }} />
            <span className={`text-xs font-medium ${NAME_SCORE_TEXT_CLASS}`} style={{ color: player.playerId === localPlayerId ? 'var(--color-amber-100)' : 'var(--text-muted)' }}>{player.playerName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Round-by-round summary with winners and perfect bids */
function RoundSummaries({ players, maxRounds }: { players: IPlayer[]; maxRounds: number }) {
  return (
    <div className="rounded-lg p-4" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--surface-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <i className="ra ra-cycle text-base" style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-amber-100)', fontFamily: 'var(--font-serif)' }}>Battle Summary</span>
      </div>
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {Array.from({ length: maxRounds }, (_, roundIdx) => {
          const roundData = players.map((p) => ({ name: p.name, id: p.id, ...p.roundHistory[roundIdx] }));
          const roundWinner = [...roundData].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
          const perfectCount = roundData.filter((r) => r.bid === r.tricksWon).length;
          return (
            <div key={roundIdx} className="flex items-center justify-between gap-3 min-w-0 p-2 rounded text-sm" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), white 6%) 50%, transparent)' }}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-medium w-8" style={{ color: 'var(--accent)' }}>R{roundIdx + 1}</span>
                <span className="text-xs" style={{ color: 'var(--accent-dim)' }}>{roundIdx + 1} cards</span>
              </div>
              <div className="flex items-center justify-end gap-3 text-xs min-w-0 flex-1">
                <span className="flex-shrink-0" style={{ color: '#4ade80' }}>{perfectCount} perfect</span>
                <span className="inline-flex items-center min-w-0 max-w-[60%]" style={{ color: 'var(--accent-parchment)' }}>
                  <i className="ra ra-crown text-[10px] mr-1 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                  <span className={NAME_SCORE_TEXT_CLASS}>{roundWinner?.name}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RecapTab({ players, localPlayerId, maxRounds, scoreProgression, maxScore }: RecapTabProps) {
  return (
    <div className="space-y-4">
      <ScoreProgressionChart scoreProgression={scoreProgression} localPlayerId={localPlayerId} maxRounds={maxRounds} maxScore={maxScore} />
      <RoundSummaries players={players} maxRounds={maxRounds} />
    </div>
  );
}
