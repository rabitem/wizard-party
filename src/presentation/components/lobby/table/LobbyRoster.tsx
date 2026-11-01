'use client';

import { Bot, Check, Crown, Plus, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../../account/PlayerAvatar';
import type { LobbySeatView } from './lobby-view.types';
import { seatStatusLabel } from './RoundTable';

interface LobbyRosterProps {
  seats: LobbySeatView[];
  maxPlayers: number;
  className?: string;
  onSeatClick: (seat: LobbySeatView) => void;
  onEmptySeatClick: (seatNumber: number) => void;
}

function statusTone(seat: LobbySeatView): string {
  if (!seat.isConnected) return 'text-amber-400';
  if (seat.isHost) return 'text-amber-300';
  return seat.isReady ? 'text-emerald-300/90' : 'text-amber-500/80';
}

function StatusIcon({ seat }: { seat: LobbySeatView }) {
  if (!seat.isConnected) return <WifiOff className="w-3.5 h-3.5" aria-hidden />;
  if (seat.isHost) return <Crown className="w-3.5 h-3.5" aria-hidden />;
  if (seat.isReady) return <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden />;
  return null;
}

/**
 * The seated players as a list, for the lobby's control panel on wide screens: who is in and who
 * is ready, readable at a glance. Each row opens the same seat sheet as the seat at the table.
 */
export function LobbyRoster({ seats, maxPlayers, className = '', onSeatClick, onEmptySeatClick }: LobbyRosterProps) {
  const openSeats = Math.max(0, maxPlayers - seats.length);
  return (
    <section aria-labelledby="lobby-roster-heading" className={`flex flex-col gap-2 ${className}`}>
      <h2 id="lobby-roster-heading" className="flex items-baseline justify-between text-amber-100 text-sm font-serif">
        Players
        <span className="text-xs text-amber-500/80 tabular-nums">{seats.length} of {Math.max(maxPlayers, seats.length)}</span>
      </h2>
      <ul className="-mx-2 min-h-0 overflow-y-auto overscroll-contain">
        {seats.map((seat) => (
          <li key={seat.id}>
            <button
              type="button"
              onClick={() => onSeatClick(seat)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left cursor-pointer hover:bg-amber-900/25 focus-visible:bg-amber-900/25"
            >
              {seat.isBot ? (
                <span className="w-8 h-8 shrink-0 rounded-full border-2 border-amber-700/60 flex items-center justify-center text-amber-400/90"><Bot className="w-4 h-4" aria-hidden /></span>
              ) : (
                <PlayerAvatar avatarId={seat.avatarId} level={seat.level} size="sm" />
              )}
              <span className={`font-serif min-w-0 flex-1 truncate text-sm text-amber-50 ${seat.isConnected ? '' : 'opacity-60'}`}>
                {seat.name}{seat.isLocal ? <span className="text-amber-400/80"> (you)</span> : null}
                {seat.isGuest ? <span className="text-amber-500/70 text-xs"> · guest</span> : null}
              </span>
              <span className={`font-serif shrink-0 inline-flex items-center gap-1 text-xs ${statusTone(seat)}`}>
                <StatusIcon seat={seat} />
                {seatStatusLabel(seat, null)}
              </span>
            </button>
          </li>
        ))}
        {openSeats > 0 ? (
          <li>
            <button
              type="button"
              onClick={() => onEmptySeatClick(seats.length + 1)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl text-left cursor-pointer text-amber-500/90 hover:bg-amber-900/25 hover:text-amber-200 focus-visible:bg-amber-900/25"
            >
              <span className="w-8 h-8 shrink-0 rounded-full border-2 border-dashed border-amber-600/60 flex items-center justify-center"><Plus className="w-4 h-4" aria-hidden /></span>
              <span className="text-sm font-serif">{openSeats === 1 ? '1 open seat' : `${openSeats} open seats`}</span>
              <span className="ml-auto text-xs font-serif">Fill a seat</span>
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
