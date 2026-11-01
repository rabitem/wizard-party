'use client';

import { IPlayer } from '@shared/domain';
import { WINNER_NAME_LINE_CLASS } from '../name-score-layout';

interface GameEndHeaderProps {
  winner: IPlayer | undefined;
  isWinner: boolean;
}

export function GameEndHeader({ winner, isWinner }: GameEndHeaderProps) {
  return (
    <div className="relative px-6 pt-6 pb-4 text-center">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 70%)' }}
      />

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-3">
        {[
          { id: 'star-left', symbol: '✦', delay: 0 },
          { id: 'star-center', symbol: '★', delay: 0.3 },
          { id: 'star-right', symbol: '✦', delay: 0.6 },
        ].map((star) => (
          <span
            key={star.id}
            className="animate-pulse"
            style={{ color: 'var(--accent)', fontSize: '12px', animationDelay: `${star.delay}s` }}
          >
            {star.symbol}
          </span>
        ))}
      </div>

      {/* Trophy icon */}
      <div
        className="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center relative"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 50%, var(--accent-cta-bottom) 100%)',
          boxShadow: '0 8px 32px color-mix(in srgb, var(--accent) 40%, transparent), inset 0 2px 0 rgba(255,255,255,0.2)',
        }}
      >
        <i className="ra ra-trophy text-4xl" style={{ color: '#fff' }} />
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <i className="ra ra-crown text-xl" style={{ color: 'var(--accent-bright)' }} />
        </div>
      </div>

      <h1
        className="text-3xl font-bold mb-1"
        style={{ color: 'var(--color-amber-100)', fontFamily: 'var(--font-serif)' }}
      >
        {isWinner ? 'Victory!' : 'Game Over'}
      </h1>
      <p className="text-sm mx-auto max-w-full min-w-0 px-2" style={{ color: 'var(--text-muted)' }}>
        {isWinner ? 'You are the Wizard Champion!' : (
          <>
            <span className={WINNER_NAME_LINE_CLASS} title={winner?.name}>{winner?.name}</span>
            <span className="block">claims victory with {winner?.score} points!</span>
          </>
        )}
      </p>
    </div>
  );
}
