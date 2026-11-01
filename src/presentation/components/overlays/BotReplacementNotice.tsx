'use client';

import { NAME_SCORE_TEXT_CLASS } from '../name-score-layout';

interface BotReplacementNoticeProps {
  isWaitingForMe: boolean;
  playerName: string;
}

export function BotReplacementNotice({ isWaitingForMe, playerName }: BotReplacementNoticeProps) {
  return (
    <div
      className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-lg"
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid color-mix(in srgb, var(--color-amber-800) 15%, transparent)',
      }}
    >
      {/* Bot/Golem icon */}
      <div className="shrink-0 mt-0.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-amber-600/50 sm:w-[18px] sm:h-[18px]">
          <path
            d="M12 2a2 2 0 012 2v1h3a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h3V4a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="9" cy="11" r="1.5" fill="currentColor" />
          <circle cx="15" cy="11" r="1.5" fill="currentColor" />
          <path d="M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p
        className="text-xs sm:text-sm leading-relaxed min-w-0"
        style={{
          fontFamily: 'Georgia, serif',
          color: 'color-mix(in srgb, var(--accent) 60%, transparent)',
        }}
      >
        {isWaitingForMe ? (
          'Should you fail to return, a golem shall take your place in battle.'
        ) : (
          <>
            Should <span className={`text-amber-400/70 inline-block max-w-[140px] align-bottom ${NAME_SCORE_TEXT_CLASS}`} title={playerName}>{playerName}</span> not return, a golem shall continue in their stead.
          </>
        )}
      </p>
    </div>
  );
}
