'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Undo2, Check, X, Clock } from 'lucide-react';

export interface UndoRequest {
  requesterId: string;
  requesterName: string;
  cardId: string;
  cardDescription: string;
  timestamp: number;
  responses: Map<string, boolean>;
  requiredApprovals: number;
}

function calculateTimeRemaining(timestamp: number): number {
  const elapsed = Math.floor((Date.now() - timestamp) / 1000);
  return Math.max(0, 15 - elapsed);
}

interface UndoRequestUIProps {
  undoRequest: UndoRequest | null;
  localPlayerId: string;
  onRequestUndo: () => void;
  onRespondUndo: (approved: boolean) => void;
  canRequestUndo: boolean;
}

export function UndoRequestUI({
  undoRequest,
  localPlayerId,
  onRequestUndo,
  onRespondUndo,
  canRequestUndo,
}: UndoRequestUIProps) {
  // Track countdown ticks since the request started
  const [countdownTick, setCountdownTick] = useState(0);

  // Reset countdown when request changes
  useEffect(() => {
    setCountdownTick(0);
  }, [undoRequest?.timestamp]);

  // Calculate time remaining based on initial timestamp and ticks elapsed
  const timeRemaining = useMemo(() => {
    if (!undoRequest) return 15;
    const initial = calculateTimeRemaining(undoRequest.timestamp);
    return Math.max(0, initial - countdownTick);
  }, [undoRequest, countdownTick]);

  // Countdown timer for undo requests
  useEffect(() => {
    if (!undoRequest) return;

    const interval = setInterval(() => {
      setCountdownTick((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [undoRequest?.timestamp]);

  const isRequester = undoRequest?.requesterId === localPlayerId;
  const hasResponded = undoRequest?.responses.has(localPlayerId);
  const approvalCount = undoRequest
    ? Array.from(undoRequest.responses.values()).filter(Boolean).length
    : 0;

  return (
    <>
      {/* Undo button (shown when no active request and can request) */}
      {!undoRequest && canRequestUndo && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={onRequestUndo}
          className="fixed bottom-20 right-4 p-3 bg-amber-600/90 hover:bg-amber-500 backdrop-blur-sm rounded-xl shadow-lg transition-colors z-30 cursor-pointer flex items-center gap-2"
          title="Request undo"
        >
          <Undo2 className="w-5 h-5 text-white" />
          <span className="text-white text-sm font-medium hidden sm:inline">Undo</span>
        </motion.button>
      )}

      {/* Active undo request dialog */}
      <AnimatePresence>
        {undoRequest && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-2xl p-4 z-40 w-[90%] max-w-sm"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Undo2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">
                  {isRequester ? 'Undo Requested' : 'Undo Request'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {isRequester
                    ? 'Waiting for approval...'
                    : `${undoRequest.requesterName} wants to undo`}
                </p>
              </div>
              <div className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{timeRemaining}s</span>
              </div>
            </div>

            {/* Card info */}
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 mb-3">
              <span className="text-zinc-400 text-sm">Card played: </span>
              <span className="text-white font-medium">{undoRequest.cardDescription}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(approvalCount / undoRequest.requiredApprovals) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-zinc-400">
                {approvalCount}/{undoRequest.requiredApprovals}
              </span>
            </div>

            {/* Actions (for non-requesters who haven't responded) */}
            {!isRequester && !hasResponded && (
              <div className="flex gap-2">
                <button
                  onClick={() => onRespondUndo(false)}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Deny
                </button>
                <button
                  onClick={() => onRespondUndo(true)}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Allow
                </button>
              </div>
            )}

            {/* Status for requester or those who responded */}
            {(isRequester || hasResponded) && (
              <div className="text-center text-sm text-zinc-400">
                {isRequester
                  ? 'Waiting for other players to approve...'
                  : hasResponded
                  ? `You ${undoRequest.responses.get(localPlayerId) ? 'approved' : 'denied'} this request`
                  : ''}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
