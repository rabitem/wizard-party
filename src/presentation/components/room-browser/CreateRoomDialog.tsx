'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { nanoid } from 'nanoid';
import { X, RefreshCw, Globe, Lock, Loader2, Check, Plus, Users, ArrowRight } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { Modal } from './Modal';
import { ROOM_CODE_MIN, ROOM_CODE_MAX, RoomSettings } from './utils';
import { buildCreateRoomSettings } from './create-room-settings';
import { savePendingRoomSetup } from './pending-room';
import { buildPartyRoomUrl, normalizePartyHostInput } from './room-host';
import { RulesetSection } from '../settings';
import { DEFAULT_RULESET_CONFIG, type IRulesetConfig } from '@shared/domain';

// Generate URL-safe room code using nanoid
function generateNanoidRoomCode(): string {
  // Use custom alphabet without ambiguous characters (similar to existing generateRoomId)
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const length = 6;
  let result = '';
  const nanoidValue = nanoid(length);
  // Map nanoid output to our custom alphabet for consistency
  for (let i = 0; i < length; i++) {
    const charCode = nanoidValue.charCodeAt(i);
    result += alphabet[charCode % alphabet.length];
  }
  return result;
}

function getRoomCodeBorderClass(availabilityStatus: 'available' | 'taken' | 'error' | null, isValidLength: boolean): string {
  if (availabilityStatus === 'taken') return 'border-red-700/60 focus:border-red-600 focus:ring-red-500/20';
  if (availabilityStatus === 'available' && isValidLength) return 'border-emerald-700/60 focus:border-emerald-600 focus:ring-emerald-500/20';
  return 'border-amber-700/40 focus:border-amber-500 focus:ring-amber-500/20';
}

function getVisibilityButtonClass(isActive: boolean): string {
  if (isActive) return 'border-amber-600/60 text-amber-200';
  return 'border-amber-800/40 text-amber-500/60 hover:border-amber-700/50';
}

function getVisibilityButtonBackground(isActive: boolean): string {
  if (isActive) return 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 25%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 15%, transparent) 100%)';
  return 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 100%)';
}

function getMaxPlayersButtonClass(isSelected: boolean): string {
  if (isSelected) return 'border-amber-500/70 text-amber-100';
  return 'border-amber-800/40 text-amber-500/60 hover:border-amber-700/50';
}

function getMaxPlayersButtonBackground(isSelected: boolean): string {
  if (isSelected) return 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 35%, transparent) 0%, color-mix(in srgb, var(--color-amber-700) 25%, transparent) 100%)';
  return 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 100%)';
}

/** Determines availability status from API response */
async function parseAvailabilityResponse(response: Response): Promise<'available' | 'taken'> {
  if (response.ok) {
    const data = await response.json();
    return data.playerCount > 0 ? 'taken' : 'available';
  }
  // 404 or other status means room doesn't exist yet = available
  return 'available';
}

interface CreateRoomDialogProps {
  onClose: () => void;
  onCreate: (roomId: string, settings: RoomSettings) => void;
  host: string;
}

/** Dialog header with title and close button */
function DialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-700/30 sticky top-0 z-10" style={{ background: THEME_SURFACE.HEADER_BG }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-600/40 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 10%, transparent) 100%)' }}>
            <Plus className="w-5 h-5 text-amber-500/80" />
          </div>
          <div>
            <h2 className="text-lg text-amber-100/95 font-serif">Create Room</h2>
            <p className="text-amber-500/50 text-xs font-serif">Set up your game</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-amber-900/30 rounded-lg transition-colors">
          <X className="w-5 h-5 text-amber-500/60" />
        </button>
      </div>
    </div>
  );
}

/** Room name input field */
function RoomNameInput({ roomName, onChange }: { roomName: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="block text-sm text-amber-300/80 mb-1.5 sm:mb-2 font-serif">Room Name</label>
      <input
        type="text"
        value={roomName}
        onChange={(e) => onChange(e.target.value.slice(0, 20))}
        maxLength={20}
        placeholder="The Wizard's Den"
        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-amber-700/40 placeholder-amber-600/40 hover:border-amber-600/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors cursor-text text-sm sm:text-base"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 65%) 90%, transparent) 100%)', fontFamily: 'var(--font-serif)', color: 'color-mix(in srgb, var(--color-amber-100) 95%, transparent)' }}
      />
      <span className={`font-serif text-xs mt-1 block ${roomName.length >= 20 ? 'text-amber-500' : 'text-amber-600/50'}`}>{roomName.length}/20 characters</span>
    </div>
  );
}

/** Room code input with availability check */
function RoomCodeInput({ roomId, isChecking, availabilityStatus, isValidLength, onChange, onRefresh }: {
  roomId: string;
  isChecking: boolean;
  availabilityStatus: 'available' | 'taken' | 'error' | null;
  isValidLength: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
}) {
  return (
    <div>
      <label className="block text-sm text-amber-300/80 mb-1.5 sm:mb-2 font-serif">Room Code</label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={roomId}
            onChange={onChange}
            maxLength={ROOM_CODE_MAX}
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border font-mono tracking-wider hover:border-amber-600/50 focus:ring-2 transition-colors cursor-text text-sm sm:text-base ${getRoomCodeBorderClass(availabilityStatus, isValidLength)}`}
            style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 65%) 90%, transparent) 100%)', color: 'color-mix(in srgb, var(--color-amber-100) 95%, transparent)' }}
          />
          {isChecking ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 text-amber-400 animate-spin" /></div> : null}
          {!isChecking && availabilityStatus === 'available' && isValidLength ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><Check className="w-4 h-4 text-emerald-500" /></div> : null}
          {!isChecking && availabilityStatus === 'taken' ? <div className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-red-500" /></div> : null}
        </div>
        <button
          onClick={onRefresh}
          className="px-3 sm:px-4 py-2 rounded-lg border border-amber-700/40 hover:border-amber-600/50 hover:bg-amber-900/30 text-amber-400/80 transition-colors cursor-pointer flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)' }}
          title="Generate new code"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between flex-wrap gap-1">
        <span className={`font-serif text-xs ${roomId.length < ROOM_CODE_MIN ? 'text-amber-500' : 'text-amber-600/50'}`}>{roomId.length}/{ROOM_CODE_MIN}-{ROOM_CODE_MAX} characters</span>
        {availabilityStatus === 'taken' ? <span className="text-xs text-red-400 font-serif">Code already in use</span> : null}
      </div>
    </div>
  );
}

/** Visibility toggle buttons */
function VisibilitySelector({ isPublic, onChange }: { isPublic: boolean; onChange: (isPublic: boolean) => void }) {
  return (
    <div>
      <label className="block text-sm text-amber-300/80 mb-1.5 sm:mb-2 font-serif">Visibility</label>
      <div className="flex gap-2">
        <button onClick={() => onChange(true)} className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${getVisibilityButtonClass(isPublic)}`} style={{ background: getVisibilityButtonBackground(isPublic), fontFamily: 'var(--font-serif)' }}>
          <Globe className="w-4 h-4" /> Public
        </button>
        <button onClick={() => onChange(false)} className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base ${getVisibilityButtonClass(!isPublic)}`} style={{ background: getVisibilityButtonBackground(!isPublic), fontFamily: 'var(--font-serif)' }}>
          <Lock className="w-4 h-4" /> Private
        </button>
      </div>
    </div>
  );
}

/** Max players selector */
function MaxPlayersSelector({ maxPlayers, onChange }: { maxPlayers: number; onChange: (num: number) => void }) {
  return (
    <div>
      <label className="block text-sm text-amber-300/80 mb-1.5 sm:mb-2 flex items-center gap-2 font-serif">
        <Users className="w-4 h-4 text-amber-500/60" />Max Players
      </label>
      <div className="grid grid-cols-4 gap-2">
        {[3, 4, 5, 6].map((num) => (
          <button key={num} onClick={() => onChange(num)} className={`py-2.5 sm:py-3 rounded-lg border transition-all cursor-pointer text-sm sm:text-base ${getMaxPlayersButtonClass(maxPlayers === num)}`} style={{ background: getMaxPlayersButtonBackground(maxPlayers === num), fontFamily: 'var(--font-serif)' }}>
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Action buttons section */
function DialogActions({ onClose, onCreate, canCreate, isChecking }: { onClose: () => void; onCreate: () => void; canCreate: boolean; isChecking: boolean }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:pb-5 flex gap-3 sticky bottom-0 border-t border-amber-800/30" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 98%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 42%) 100%, transparent) 100%)' }}>
      <button onClick={onClose} className="relative flex-1 py-3 rounded border border-amber-700/40 hover:border-amber-600/50 hover:bg-amber-900/20 text-amber-300/80 text-sm transition-all cursor-pointer active:scale-[0.98]"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)', fontFamily: 'var(--font-serif)' }}>
        {/* Corner accents */}
        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/30 pointer-events-none" />
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/30 pointer-events-none" />
        <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/30 pointer-events-none" />
        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/30 pointer-events-none" />
        <span className="relative">Cancel</span>
      </button>
      <button onClick={onCreate} disabled={!canCreate} className="relative flex-1 py-3 rounded font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: canCreate ? 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 50%, var(--accent-cta-bottom) 100%)' : 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 100%)',
          boxShadow: canCreate ? '0 4px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none', fontFamily: 'var(--font-serif)', color: canCreate ? '#1a1510' : 'color-mix(in srgb, var(--color-amber-100) 50%, transparent)' }}>
        {/* Border frame */}
        <div className="absolute inset-0 border-2 border-amber-800/20 rounded pointer-events-none" />
        {/* Corner accents */}
        <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-amber-900/40 pointer-events-none" />
        <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-amber-900/40 pointer-events-none" />
        <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-amber-900/40 pointer-events-none" />
        <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-amber-900/40 pointer-events-none" />
        <span className="relative flex items-center gap-2">
          {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Create<ArrowRight className="w-4 h-4" />
        </span>
      </button>
    </div>
  );
}

/** Footer links section */
function DialogFooter() {
  return (
    <div className="px-4 sm:px-6 py-3 border-t border-amber-700/20">
      <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs font-serif">
        <Link href="/privacy" className="text-amber-600/30 hover:text-amber-400 transition-colors">Privacy</Link>
        <span className="text-amber-700/20">·</span>
        <Link href="/imprint" className="text-amber-600/30 hover:text-amber-400 transition-colors">Imprint</Link>
      </div>
    </div>
  );
}

/** Hook to manage room availability checking */
function useRoomAvailability(host: string, roomId: string) {
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'taken' | 'error' | null>(null);

  const checkRoomAvailability = useCallback(async (code: string) => {
    if (code.length < ROOM_CODE_MIN || code.length > ROOM_CODE_MAX) { setAvailabilityStatus(null); return; }
    setIsChecking(true);
    try {
      const response = await fetch(buildPartyRoomUrl(host, code), { method: 'GET', headers: { Accept: 'application/json' } });
      setAvailabilityStatus(await parseAvailabilityResponse(response));
    } catch { setAvailabilityStatus('available'); }
    finally { setIsChecking(false); }
  }, [host]);

  useEffect(() => {
    const timer = setTimeout(() => { if (roomId.length >= ROOM_CODE_MIN) checkRoomAvailability(roomId); }, 300);
    return () => clearTimeout(timer);
  }, [roomId, checkRoomAvailability]);

  return { isChecking, availabilityStatus, setAvailabilityStatus };
}

export function CreateRoomDialog({ onClose, onCreate, host }: CreateRoomDialogProps) {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState(generateNanoidRoomCode());
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [rulesetConfig, setRulesetConfig] = useState<IRulesetConfig>(DEFAULT_RULESET_CONFIG);
  const { isChecking, availabilityStatus, setAvailabilityStatus } = useRoomAvailability(host, roomId);
  const isValidLength = roomId.length >= ROOM_CODE_MIN && roomId.length <= ROOM_CODE_MAX;
  const canCreate = isValidLength && availabilityStatus !== 'taken' && !isChecking;

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, ROOM_CODE_MAX));
    setAvailabilityStatus(null);
  };

  const handleCreate = () => {
    if (!isValidLength || availabilityStatus === 'taken') return;
    const settings: RoomSettings = buildCreateRoomSettings({ roomId, roomName, isPublic, maxPlayers, rulesetConfig });
    savePendingRoomSetup({ roomId, settings, host: normalizePartyHostInput(host), isCreator: true });
    onCreate(roomId, settings);
    router.push(`/lobby/${roomId}`);
  };

  const handleRefreshRoomCode = () => { setRoomId(generateNanoidRoomCode()); setAvailabilityStatus(null); };

  return (
    <Modal onClose={onClose}>
      <DialogHeader onClose={onClose} />
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        <RoomNameInput roomName={roomName} onChange={setRoomName} />
        <RoomCodeInput roomId={roomId} isChecking={isChecking} availabilityStatus={availabilityStatus} isValidLength={isValidLength} onChange={handleRoomIdChange} onRefresh={handleRefreshRoomCode} />
        <VisibilitySelector isPublic={isPublic} onChange={setIsPublic} />
        <MaxPlayersSelector maxPlayers={maxPlayers} onChange={setMaxPlayers} />
        <RulesetSection rulesetConfig={rulesetConfig} onRulesetChange={setRulesetConfig} isHost disabled={false} />
      </div>
      <DialogActions onClose={onClose} onCreate={handleCreate} canCreate={canCreate} isChecking={isChecking} />
      <DialogFooter />
    </Modal>
  );
}
