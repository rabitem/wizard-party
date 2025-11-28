'use client';

import { useState, useMemo } from 'react';
import { IPlayer, Suit, SUIT_COLORS, SUIT_SYMBOLS, SUIT_NAMES } from '@shared/domain';
import { AlertCircle, Loader2, Minus, Plus, Target, Users } from 'lucide-react';

interface BiddingUIProps {
  players: IPlayer[];
  localPlayerId: string;
  currentPlayerIndex: number;
  maxBid: number;
  trumpSuit: Suit | null;
  forbiddenBid: number | null;
  onPlaceBid: (bid: number) => void;
}

function getValidBid(bid: number, forbiddenBid: number | null, maxBid: number): number {
  if (forbiddenBid === null || bid !== forbiddenBid) return bid;
  if (forbiddenBid > 0) return forbiddenBid - 1;
  return Math.min(forbiddenBid + 1, maxBid);
}

export function BiddingUI({
  players,
  localPlayerId,
  currentPlayerIndex,
  maxBid,
  trumpSuit,
  forbiddenBid,
  onPlaceBid,
}: BiddingUIProps) {
  // Track user's manual selection separately from auto-adjustment
  const [userSelectedBid, setUserSelectedBid] = useState<number | null>(null);
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === localPlayerId;
  const totalBids = players.reduce((sum, p) => sum + (p.bid ?? 0), 0);
  const bidsPlaced = players.filter(p => p.bid !== null).length;

  // Compute the effective selected bid:
  // - If user hasn't manually selected, use a valid default (0 or adjusted)
  // - If user has selected but it's now forbidden, adjust it
  const selectedBid = useMemo(() => {
    if (userSelectedBid === null) {
      return getValidBid(0, forbiddenBid, maxBid);
    }
    return getValidBid(userSelectedBid, forbiddenBid, maxBid);
  }, [userSelectedBid, forbiddenBid, maxBid]);

  const handleBidChange = (newBid: number) => {
    if (newBid >= 0 && newBid <= maxBid && newBid !== forbiddenBid) {
      setUserSelectedBid(newBid);
    }
  };

  const decrementBid = () => {
    let newBid = selectedBid - 1;
    if (newBid === forbiddenBid) newBid--;
    if (newBid >= 0) setUserSelectedBid(newBid);
  };

  const incrementBid = () => {
    let newBid = selectedBid + 1;
    if (newBid === forbiddenBid) newBid++;
    if (newBid <= maxBid) setUserSelectedBid(newBid);
  };

  return (
    <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-4 px-4">
      <div className="w-full max-w-md">
        {/* Main bidding card */}
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-b from-amber-500/25 via-amber-600/10 to-transparent rounded-3xl blur-2xl" />

          <div className="relative bg-gradient-to-b from-[#13131f] to-[#0a0a10] border border-amber-500/20 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(251,191,36,0.08)_0%,_transparent_50%)]" />

              {/* Trump indicator */}
              {trumpSuit ? (
                <div
                  className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-3"
                  style={{
                    backgroundColor: `${SUIT_COLORS[trumpSuit]}10`,
                    borderColor: `${SUIT_COLORS[trumpSuit]}30`
                  }}
                >
                  <span className="text-amber-300/60 text-[10px] uppercase tracking-widest">Trump</span>
                  <span style={{ color: SUIT_COLORS[trumpSuit] }} className="text-lg">
                    {SUIT_SYMBOLS[trumpSuit]}
                  </span>
                  <span style={{ color: SUIT_COLORS[trumpSuit] }} className="font-medium text-sm">
                    {SUIT_NAMES[trumpSuit]}
                  </span>
                </div>
              ) : (
                <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/30 mb-3">
                  <span className="text-amber-300/60 text-[10px] uppercase tracking-widest">Trump</span>
                  <span className="text-zinc-400 font-medium text-sm">None</span>
                </div>
              )}

              <h2 className="relative text-2xl font-light text-amber-50 tracking-wide">
                {isMyTurn ? 'Place Your Bid' : 'Bidding Phase'}
              </h2>
            </div>

            {/* Player progress */}
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-400/50" />
                  <span className="text-[11px] text-amber-400/50 uppercase tracking-wider">Players</span>
                </div>
                <span className="text-xs text-amber-200/60">{bidsPlaced} of {players.length} placed</span>
              </div>

              <div className="flex items-center gap-1.5">
                {players.map((player, index) => {
                  const isCurrent = index === currentPlayerIndex;
                  const isLocal = player.id === localPlayerId;
                  const hasBid = player.bid !== null;

                  return (
                    <div key={player.id} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 scale-105'
                            : hasBid
                            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                            : 'bg-[#0d0d18] border border-amber-500/10 text-amber-200/30'
                        }`}
                      >
                        {hasBid ? player.bid : isCurrent ? '?' : '–'}
                      </div>
                      <span className={`mt-1 text-[10px] truncate max-w-full px-1 ${
                        isLocal ? 'text-amber-300' : isCurrent ? 'text-amber-200' : 'text-amber-200/40'
                      }`}>
                        {isLocal ? 'You' : player.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bid summary bar */}
            <div className="mx-6 mb-4 px-4 py-2.5 rounded-xl bg-[#0a0a12] border border-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400/50" />
                <span className="text-xs text-amber-400/50 uppercase tracking-wider">Total Bids</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xl font-semibold ${totalBids > maxBid ? 'text-red-400' : totalBids === maxBid ? 'text-amber-400' : 'text-amber-100'}`}>
                  {totalBids}
                </span>
                <span className="text-amber-400/30 text-lg">/</span>
                <span className="text-amber-400/60 text-lg">{maxBid}</span>
                <span className="text-[10px] text-amber-400/40 ml-1">tricks</span>
              </div>
            </div>

            {/* Content area */}
            <div className="px-6 pb-6">
              {isMyTurn ? (
                <>
                  {/* Forbidden bid warning */}
                  {forbiddenBid !== null && (
                    <div className="flex items-center justify-center gap-2 text-xs text-red-300/80 mb-4 py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Can&apos;t bid <span className="font-bold">{forbiddenBid}</span> (would equal tricks)</span>
                    </div>
                  )}

                  {/* Main bid selector */}
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <button
                      onClick={decrementBid}
                      disabled={selectedBid <= 0 || (selectedBid === 1 && forbiddenBid === 0)}
                      className="w-12 h-12 rounded-xl bg-[#0d0d18] border border-amber-500/20 hover:border-amber-500/40 hover:bg-[#15152a] text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-amber-400/30 to-amber-600/30 rounded-2xl blur-xl" />
                      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/40">
                        <span className="text-5xl font-bold text-white">{selectedBid}</span>
                      </div>
                    </div>

                    <button
                      onClick={incrementBid}
                      disabled={selectedBid >= maxBid || (selectedBid === maxBid - 1 && forbiddenBid === maxBid)}
                      className="w-12 h-12 rounded-xl bg-[#0d0d18] border border-amber-500/20 hover:border-amber-500/40 hover:bg-[#15152a] text-amber-300 flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick select grid */}
                  <div className="flex justify-center gap-1.5 flex-wrap mb-5">
                    {Array.from({ length: maxBid + 1 }, (_, i) => {
                      const isForbidden = i === forbiddenBid;
                      const isSelected = selectedBid === i;

                      return (
                        <button
                          key={i}
                          onClick={() => handleBidChange(i)}
                          disabled={isForbidden}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            isForbidden
                              ? 'bg-red-950/30 text-red-500/30 cursor-not-allowed line-through border border-red-500/10'
                              : isSelected
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40 scale-110'
                              : 'bg-[#0d0d18] text-amber-200/50 hover:text-amber-100 hover:bg-[#15152a] border border-amber-500/10 hover:border-amber-500/30'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm button */}
                  <button
                    onClick={() => onPlaceBid(selectedBid)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-semibold transition-all cursor-pointer active:scale-[0.98] shadow-xl shadow-amber-500/20"
                  >
                    Confirm Bid
                  </button>
                </>
              ) : (
                /* Waiting state */
                <div className="flex items-center justify-center gap-3 py-6">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="text-amber-200/70">
                    Waiting for <span className="text-amber-300 font-medium">{currentPlayer?.name}</span>...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
