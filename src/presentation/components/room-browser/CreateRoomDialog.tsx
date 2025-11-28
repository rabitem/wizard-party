'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Globe, Lock, Loader2, Check } from 'lucide-react';
import { Modal } from './Modal';
import { generateRoomId, ROOM_CODE_MIN, ROOM_CODE_MAX, RoomSettings } from './utils';

interface CreateRoomDialogProps {
  onClose: () => void;
  onCreate: (roomId: string, settings: RoomSettings) => void;
  host: string;
}

export function CreateRoomDialog({ onClose, onCreate, host }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState(generateRoomId());
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'taken' | 'error' | null>(null);

  const isValidLength = roomId.length >= ROOM_CODE_MIN && roomId.length <= ROOM_CODE_MAX;

  const checkRoomAvailability = useCallback(
    async (code: string) => {
      if (code.length < ROOM_CODE_MIN || code.length > ROOM_CODE_MAX) {
        setAvailabilityStatus(null);
        return;
      }

      setIsChecking(true);
      try {
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const response = await fetch(`${protocol}://${host}/party/${code}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          setAvailabilityStatus(data.playerCount > 0 ? 'taken' : 'available');
        } else if (response.status === 404) {
          setAvailabilityStatus('available');
        } else {
          setAvailabilityStatus('available');
        }
      } catch {
        setAvailabilityStatus('available');
      } finally {
        setIsChecking(false);
      }
    },
    [host]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (roomId.length >= ROOM_CODE_MIN) {
        checkRoomAvailability(roomId);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [roomId, checkRoomAvailability]);

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, ROOM_CODE_MAX);
    setRoomId(value);
    setAvailabilityStatus(null);
  };

  const handleCreate = () => {
    if (isValidLength && availabilityStatus !== 'taken') {
      onCreate(roomId, { name: roomName || roomId, isPublic, maxPlayers });
    }
  };

  const canCreate = isValidLength && availabilityStatus !== 'taken' && !isChecking;

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-light text-amber-100 tracking-wide">Create Room</h2>
          <p className="text-amber-200/50 text-sm">Configure your game room</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-amber-400/70" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-amber-200/70 mb-2">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="My Game Room"
            className="w-full px-4 py-3 bg-[#0a0a15] text-amber-100 rounded-xl border border-amber-500/20 placeholder-amber-200/30 hover:border-amber-500/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-200/70 mb-2">Room Code</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={roomId}
                onChange={handleRoomIdChange}
                maxLength={ROOM_CODE_MAX}
                className={`w-full px-4 py-3 bg-[#0a0a15] text-amber-100 rounded-xl border font-mono hover:border-amber-500/40 focus:ring-1 transition-colors cursor-text ${
                  availabilityStatus === 'taken'
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : availabilityStatus === 'available' && isValidLength
                      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
                      : 'border-amber-500/20 focus:border-amber-500 focus:ring-amber-500'
                }`}
              />
              {isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                </div>
              )}
              {!isChecking && availabilityStatus === 'available' && isValidLength && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
              )}
              {!isChecking && availabilityStatus === 'taken' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-red-500" />
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setRoomId(generateRoomId());
                setAvailabilityStatus(null);
              }}
              className="px-4 py-2 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-300 rounded-xl transition-colors cursor-pointer"
              title="Generate new code"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className={`text-xs ${roomId.length < ROOM_CODE_MIN ? 'text-amber-500' : 'text-amber-200/40'}`}>
              {roomId.length}/{ROOM_CODE_MIN}-{ROOM_CODE_MAX} characters
            </span>
            {availabilityStatus === 'taken' && <span className="text-xs text-red-500">Code already in use</span>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-200/70 mb-2">Visibility</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 py-3 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isPublic
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#0a0a15] border-amber-500/20 text-amber-200/50 hover:border-amber-500/40'
              }`}
            >
              <Globe className="w-4 h-4" /> Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 py-3 px-4 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                !isPublic
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-[#0a0a15] border-amber-500/20 text-amber-200/50 hover:border-amber-500/40'
              }`}
            >
              <Lock className="w-4 h-4" /> Private
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-amber-200/70 mb-2">Max Players</label>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => setMaxPlayers(num)}
                className={`flex-1 py-3 rounded-xl border transition-all cursor-pointer ${
                  maxPlayers === num
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400 text-white'
                    : 'bg-[#0a0a15] border-amber-500/20 text-amber-200/50 hover:border-amber-500/40'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
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
          onClick={handleCreate}
          disabled={!canCreate}
          className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
        >
          {isChecking && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Room
        </button>
      </div>
    </Modal>
  );
}
