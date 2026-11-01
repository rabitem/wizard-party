'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, Check, Crown, Plus, WifiOff } from 'lucide-react';
import { PlayerAvatar } from '../../account/PlayerAvatar';
import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import type { LobbySeatView } from './lobby-view.types';
import { SERIF } from './lobby-styles';
import { LobbyAvatarFrame } from '../skins/LobbyDecor';
import { LobbyIcon } from '../skins/LobbySkinText';

interface RoundTableProps {
  seats: LobbySeatView[];
  maxPlayers: number;
  palette: TableThemePalette;
  onSeatClick: (seat: LobbySeatView) => void;
  onEmptySeatClick: (seatNumber: number) => void;
}

/** Seat centres on an ellipse, starting at the bottom (the local player) and going clockwise. */
function seatPosition(index: number, count: number): { left: string; top: string } {
  const angle = Math.PI / 2 + (index * 2 * Math.PI) / count;
  return { left: `${50 + 44 * Math.cos(angle)}%`, top: `${50 + 44 * Math.sin(angle)}%` };
}

/** Rotates seating so the local player sits at the bottom, like at the game table. */
function seatOrder(seats: LobbySeatView[]): LobbySeatView[] {
  const localIndex = seats.findIndex((seat) => seat.isLocal);
  if (localIndex <= 0) return seats;
  return [...seats.slice(localIndex), ...seats.slice(0, localIndex)];
}

function useSecondsLeft(until: number | null): number | null {
  // Starts unknown so server and client render the same markup; the clock starts after mount.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (until === null) return;
    const tick = () => setNow(Date.now());
    queueMicrotask(tick);
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until === null || now === null ? null : Math.max(0, Math.ceil((until - now) / 1000));
}

function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function SeatBadge({ seat }: { seat: LobbySeatView }) {
  if (!seat.isConnected) {
    return <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center" aria-hidden><WifiOff className="w-3 h-3" /></span>;
  }
  if (seat.isReady && !seat.isHost) {
    return <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-emerald-950 flex items-center justify-center" aria-hidden><Check className="w-3 h-3" strokeWidth={3} /></span>;
  }
  return null;
}

/** Guests get a random avatar; choosing one (and this badge going away) comes with an account. */
function GuestBadge() {
  return (
    // A see-through sash across the avatar's top-right corner, clipped to the circle, so the
    // avatar icon in the middle stays uncovered.
    <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none" aria-hidden>
      <span className="absolute left-[74%] top-[26%] w-full -translate-x-1/2 -translate-y-1/2 rotate-45 border-y border-amber-600/45 bg-black/55 text-center text-[8px] leading-3 uppercase tracking-[0.14em] text-amber-200/95" style={SERIF}>
        Guest
      </span>
    </span>
  );
}

function seatStatusLabel(seat: LobbySeatView, secondsLeft: number | null): string {
  if (!seat.isConnected) return secondsLeft !== null ? `Reconnecting ${formatCountdown(secondsLeft)}` : 'Reconnecting';
  if (seat.isHost) return 'Host';
  if (seat.isBot) return `${seat.botLabel} bot`;
  return seat.isReady ? 'Ready' : 'Not ready';
}

function TakenSeat({ seat, index, onClick }: { seat: LobbySeatView; index: number; onClick: () => void }) {
  const secondsLeft = useSecondsLeft(seat.isConnected ? null : seat.graceEndsAt);
  const status = seatStatusLabel(seat, secondsLeft);
  return (
    <motion.button
      type="button"
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      onClick={onClick}
      aria-label={`${seat.name}${seat.isLocal ? ' (you)' : ''}${seat.isGuest ? ', guest' : ''}, ${status}`}
      className="group flex flex-col items-center w-[88px] cursor-pointer focus-visible:outline-none"
    >
      <span className={`relative rounded-full transition-transform group-hover:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-amber-400 ${seat.isConnected ? '' : 'opacity-55'}`}>
        {seat.isBot ? (
          <span className="w-14 h-14 rounded-full border-2 border-amber-700/60 flex items-center justify-center text-amber-400/90" style={{ background: 'var(--surface)' }}>
            <Bot className="w-6 h-6" />
          </span>
        ) : (
          <PlayerAvatar avatarId={seat.avatarId} level={seat.level} size="lg" glow={seat.isLocal} />
        )}
        <LobbyAvatarFrame index={index} isLocal={seat.isLocal} isHost={seat.isHost} isBot={seat.isBot} />
        {seat.isHost ? (
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-4 h-4 text-amber-300 drop-shadow" aria-hidden>
            <LobbyIcon id="host" className="w-4 h-4"><Crown className="w-4 h-4" /></LobbyIcon>
          </span>
        ) : null}
        <SeatBadge seat={seat} />
        {seat.isGuest ? <GuestBadge /> : null}
      </span>
      <span className="mt-1 max-w-full truncate text-xs text-amber-50 drop-shadow" style={SERIF}>
        {seat.name}{seat.isLocal ? <span className="text-amber-400/80"> (you)</span> : null}
      </span>
      <span className={`text-[10px] leading-tight ${!seat.isConnected ? 'text-amber-400' : seat.isHost ? 'text-amber-300' : seat.isReady ? 'text-emerald-300/90' : 'text-amber-500/80'}`} style={SERIF}>
        {status}
      </span>
    </motion.button>
  );
}

function OpenSeat({ seatNumber, onClick }: { seatNumber: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`Open seat ${seatNumber}: invite a friend or add a bot`} className="group flex flex-col items-center w-[88px] cursor-pointer focus-visible:outline-none">
      <span className="w-14 h-14 rounded-full border-2 border-dashed border-amber-600/60 flex items-center justify-center text-amber-400/90 transition-colors group-hover:border-amber-400 group-hover:text-amber-200 group-focus-visible:ring-2 group-focus-visible:ring-amber-400" style={{ background: 'var(--surface)' }}>
        <LobbyIcon id="emptySeat" className="w-6 h-6"><Plus className="w-6 h-6" /></LobbyIcon>
      </span>
      <span className="mt-1 text-[11px] text-amber-500/90" style={SERIF}>Open seat</span>
    </button>
  );
}

/** The lobby's centrepiece: the players seated around the table in the player's own table theme. */
export function RoundTable({ seats, maxPlayers, palette, onSeatClick, onEmptySeatClick }: RoundTableProps) {
  const ordered = seatOrder(seats);
  const seatCount = Math.max(maxPlayers, seats.length);
  const ready = seats.filter((seat) => seat.isReady && seat.isConnected).length;
  const away = seats.filter((seat) => !seat.isConnected).length;

  return (
    <div className="relative mx-auto w-full max-w-[360px] aspect-[4/3.4] mt-6 mb-10" role="group" aria-label={`Table, ${seats.length} of ${seatCount} seats taken`}>
      <div
        className="absolute inset-[13%_9%] rounded-[50%]"
        style={{
          background: `radial-gradient(ellipse at center, ${palette.felt.base} 0%, ${palette.felt.edge} 62%, ${palette.felt.center} 100%)`,
          border: `6px solid ${palette.wood.base}`,
          boxShadow: `0 0 0 2px ${palette.wood.molding}, 0 0 0 3px ${palette.accent.innerRing}55, inset 0 0 40px rgba(0,0,0,0.55), 0 14px 40px rgba(0,0,0,0.5), 0 0 60px var(--glow)`,
        }}
      >
        <div className="absolute inset-3 rounded-[50%] border border-dashed" style={{ borderColor: `${palette.felt.stitch}` }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
        {/* Own backdrop so the count stays readable on light felts (e.g. the manga table). */}
        <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-[2px]">
          <p className="text-amber-50 text-sm" style={SERIF}>{seats.length} of {seatCount} seated</p>
          <p className="text-[11px] mt-0.5 text-amber-100/75" style={SERIF}>
            {ready} ready{away ? ` · ${away} reconnecting` : ''}
          </p>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {Array.from({ length: seatCount }, (_, index) => {
          const seat = ordered[index];
          return (
            <div key={seat?.id ?? `open-${index}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={seatPosition(index, seatCount)}>
              {seat ? <TakenSeat seat={seat} index={index} onClick={() => onSeatClick(seat)} /> : <OpenSeat seatNumber={index + 1} onClick={() => onEmptySeatClick(index + 1)} />}
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
