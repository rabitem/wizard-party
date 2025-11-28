'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal';
import { ROOM_CODE_MIN, ROOM_CODE_MAX } from './utils';

interface JoinByCodeDialogProps {
  onClose: () => void;
  onJoin: (roomId: string) => void;
}

export function JoinByCodeDialog({ onClose, onJoin }: JoinByCodeDialogProps) {
  const [roomId, setRoomId] = useState('');
  const isValidLength = roomId.length >= ROOM_CODE_MIN && roomId.length <= ROOM_CODE_MAX;

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-light text-amber-100 tracking-wide">Join by Code</h2>
          <p className="text-amber-200/50 text-sm">Enter a room code to join</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-amber-400/70" />
        </button>
      </div>

      <div className="p-6">
        <input
          type="text"
          value={roomId}
          onChange={(e) =>
            setRoomId(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .slice(0, ROOM_CODE_MAX)
            )
          }
          placeholder="Enter room code"
          maxLength={ROOM_CODE_MAX}
          className="w-full px-4 py-4 bg-[#0a0a15] text-amber-100 rounded-xl border border-amber-500/20 placeholder-amber-200/30 font-mono text-center text-lg hover:border-amber-500/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-text"
          autoFocus
        />
        <div className="mt-1.5 text-center">
          <span
            className={`text-xs ${roomId.length > 0 && roomId.length < ROOM_CODE_MIN ? 'text-amber-500' : 'text-amber-200/40'}`}
          >
            {roomId.length}/{ROOM_CODE_MIN}-{ROOM_CODE_MAX} characters
          </span>
        </div>
      </div>

      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-200 rounded-xl font-medium transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => onJoin(roomId)}
          disabled={!isValidLength}
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors cursor-pointer shadow-lg shadow-amber-500/25"
        >
          Join Room
        </button>
      </div>
    </Modal>
  );
}
