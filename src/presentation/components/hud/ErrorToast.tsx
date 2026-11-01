'use client';

import { AlertTriangle, X } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  onDismiss?: () => void;
}

// Convert phase enum values to human-readable names
const phaseNames: Record<string, string> = {
  'LOBBY': 'Lobby',
  'TRUMP_SELECTION': 'Trump Selection',
  'BIDDING': 'Bidding',
  'PLAYING': 'Playing',
  'ROUND_END': 'Round End',
  'GAME_END': 'Game End',
  'PAUSED': 'Paused',
};

function humanizeMessage(message: string): string {
  // Replace phase enum values with readable names
  let result = message;
  for (const [enumValue, readableName] of Object.entries(phaseNames)) {
    result = result.replace(new RegExp(`\\b${enumValue}\\b`, 'g'), readableName);
  }
  // Clean up the message format
  result = result.replace('Expected phase:', 'Expected:');
  result = result.replace('current:', 'Current:');
  return result;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  const displayMessage = humanizeMessage(message);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40 p-4">
      <div className="relative w-full max-w-sm">
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-b from-red-900/40 via-red-800/20 to-transparent rounded-lg blur-xl" />

        {/* Main container */}
        <div
          className="relative border-2 border-red-800/50 rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1a1210 0%, #120c0c 50%, #0d0808 100%)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px rgba(139,43,43,0.2)',
          }}
        >
          {/* Decorative corners */}
          <div className="absolute top-2 left-2 text-red-800/40 text-lg">❧</div>
          <div className="absolute top-2 right-2 text-red-800/40 text-lg rotate-90">❧</div>

          {/* Content */}
          <div className="px-6 py-5">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-red-700/40" />
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-red-700/40" />
            </div>

            <h3
              className="text-center text-lg text-red-300/90 mb-3 font-serif"
            >
              Action Denied
            </h3>

            {/* Message */}
            <div className="text-center text-red-200/70 text-sm mb-4 px-2">
              {displayMessage}
            </div>

            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="w-full py-2.5 rounded border-2 border-red-700/50 font-medium transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(180deg, rgba(139,50,50,0.4) 0%, rgba(100,30,30,0.3) 100%)',
                fontFamily: 'var(--font-serif)',
                color: '#fca5a5',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>

          {/* Bottom flourish */}
          <div className="flex justify-center pb-3">
            <span className="text-red-800/40 text-sm">⚜</span>
          </div>
        </div>
      </div>
    </div>
  );
}
