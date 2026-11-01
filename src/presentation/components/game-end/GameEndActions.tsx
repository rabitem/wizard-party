'use client';

import { useState } from 'react';
import { IPlayer } from '@shared/domain';

import { BackToTournamentButton } from '../tournament/in-game';

interface GameEndActionsProps {
  winner: IPlayer | undefined;
  shareUrl: string;
  shareText: string;
  onPlayAgain: () => void;
  onReturnToLobby?: () => void;
  /** Tournament matches replace "Lobby" and "Play Again" with the way back to the tournament. */
  onBackToTournament?: () => void;
}

export function GameEndActions({
  winner,
  shareUrl,
  shareText,
  onPlayAgain,
  onReturnToLobby,
  onBackToTournament,
}: GameEndActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wizard Party Results',
          text: `🧙 ${winner?.name} wins with ${winner?.score} points!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to clipboard
      }
    }

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-4 pb-4 space-y-2">
      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full py-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-2"
        style={{
          background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), white 6%) 80%, transparent)',
          border: '1px solid var(--surface-border)',
          color: copied ? '#4ade80' : 'var(--accent-parchment)',
        }}
      >
        <i className={`ra ${copied ? 'ra-check' : 'ra-scroll-unfurled'} text-sm`} />
        {copied ? 'Copied!' : 'Share Results'}
      </button>

      {/* Main actions */}
      {onBackToTournament ? <BackToTournamentButton onClick={onBackToTournament} /> : <div className="flex gap-2">
        {onReturnToLobby ? <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            style={{
              background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), white 6%) 80%, transparent)',
              border: '1px solid var(--surface-border)',
              color: 'var(--accent-parchment)',
            }}
          >
            <i className="ra ra-wooden-sign" />
            Lobby
          </button> : null}
        <button
          onClick={onPlayAgain}
          className={`${onReturnToLobby ? 'flex-1' : 'w-full'} py-3 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2`}
          style={{
            background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)',
            border: '1px solid var(--accent-bright)',
            color: '#1a1510',
            boxShadow: '0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent)',
          }}
        >
          <i className="ra ra-cycle" />
          Play Again
        </button>
      </div>}
    </div>
  );
}
