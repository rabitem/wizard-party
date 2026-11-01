'use client';

import { SeasonalCorner } from '@/presentation/components/seasonal';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import type { ConnectionStatus } from '@/presentation/types';

/** What the main button of a prompt does. */
type PromptAction = 'take-over' | 'retry';

interface ConnectionPrompt {
  title: string;
  body: string;
  action: { kind: PromptAction; label: string };
}

/**
 * Connection states that need the player's decision. A transient drop is not one of them: the
 * table (or lobby) stays live under its non-blocking reconnecting notice and the client retries.
 */
const PROMPTS: Partial<Record<ConnectionStatus, ConnectionPrompt>> = {
  superseded: {
    title: 'Playing in another tab',
    body: 'This seat was opened in another tab or on another device. Play here to take it back; the other one stops.',
    action: { kind: 'take-over', label: 'Play here' },
  },
  failed: {
    title: 'Connection lost',
    body: 'The table could not be reached for a while. It keeps trying when your network comes back.',
    action: { kind: 'retry', label: 'Try again' },
  },
};

interface ConnectionStatusOverlayProps {
  status: ConnectionStatus;
  /** Takes the seat back after it was opened elsewhere (superseded). */
  onTakeOver: () => void;
  /** Retries now instead of waiting for the network (failed). */
  onRetry: () => void;
  onLeave: () => void;
}


/** The blocking prompt of the game page and the lobby for a superseded or failed connection. */
export function ConnectionStatusOverlay({ status, onTakeOver, onRetry, onLeave }: ConnectionStatusOverlayProps) {
  const prompt = PROMPTS[status];
  if (!prompt) return null;
  const onAction = prompt.action.kind === 'take-over' ? onTakeOver : onRetry;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" role="alertdialog" aria-labelledby="connection-status-title">
      <div className="relative border border-amber-700/40 rounded-xl p-6 max-w-sm mx-4 shadow-2xl" style={{ background: THEME_SURFACE.MODAL_BG }}>
        <SeasonalCorner position="top-right" size={32} />
        <SeasonalCorner position="bottom-left" size={32} />
        <h3 id="connection-status-title" className="text-amber-100 text-lg font-semibold mb-3 font-serif">{prompt.title}</h3>
        <p className="text-amber-200/70 text-sm mb-6 font-serif">{prompt.body}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onLeave} className="flex-1 px-4 py-2.5 rounded-lg border border-amber-600/30 text-amber-200/80 hover:bg-amber-900/20 transition-colors font-serif">Leave</button>
          <button type="button" onClick={onAction} className="flex-1 px-4 py-2.5 rounded-lg bg-amber-700/70 border border-amber-500/50 text-amber-50 hover:bg-amber-600/70 transition-colors font-serif">{prompt.action.label}</button>
        </div>
      </div>
    </div>
  );
}
