'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, Hash, Clock, Settings, ChevronDown, ChevronRight, Loader2, Info, HelpCircle } from 'lucide-react';
import { TutorialModal, useTutorialSeen } from './TutorialModal';
import {
  ShareDialog,
  CreateRoomDialog,
  JoinByCodeDialog,
  generateRoomId,
  USERNAME_KEY,
  RECENT_ROOMS_KEY,
  getDefaultHost,
  type RoomSettings,
  type RecentRoom,
} from './room-browser';

function loadSavedUsername(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(USERNAME_KEY) || '';
}

function loadRecentRooms(): RecentRoom[] {
  if (typeof window === 'undefined') return [];
  try {
    const savedRooms = localStorage.getItem(RECENT_ROOMS_KEY);
    if (savedRooms) {
      const rooms: RecentRoom[] = JSON.parse(savedRooms);
      const now = Date.now();
      return rooms.filter((r) => now - r.lastJoined < 7 * 24 * 60 * 60 * 1000).slice(0, 5);
    }
  } catch (e) {
    console.error('Failed to parse recent rooms:', e);
  }
  return [];
}

interface RoomBrowserProps {
  onJoin: (host: string, roomId: string, playerName: string, roomSettings?: RoomSettings) => void;
  initialRoomId?: string;
  initialHost?: string;
}

export function RoomBrowser({ onJoin, initialRoomId, initialHost }: RoomBrowserProps) {
  const [username, setUsername] = useState(loadSavedUsername);
  const [host, setHost] = useState(() => initialHost || getDefaultHost());
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>(loadRecentRooms);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [showShare, setShowShare] = useState<{ roomId: string; host: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Track the pending room - initialized from initialRoomId prop
  const [pendingRoom, setPendingRoom] = useState<{ roomId: string; settings?: RoomSettings } | null>(
    () => initialRoomId ? { roomId: initialRoomId } : null
  );
  // Track the last processed initialRoomId to detect prop changes
  const [lastInitialRoomId, setLastInitialRoomId] = useState(initialRoomId);
  const [isLoading, setIsLoading] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { hasSeen: hasTutorialSeen, markAsSeen: markTutorialSeen } = useTutorialSeen();

  // Handle initialRoomId prop changes - update pending room if prop changes
  if (initialRoomId !== lastInitialRoomId) {
    setLastInitialRoomId(initialRoomId);
    if (initialRoomId) {
      setPendingRoom({ roomId: initialRoomId });
    }
  }

  useEffect(() => {
    if (username) {
      localStorage.setItem(USERNAME_KEY, username);
    }
  }, [username]);

  useEffect(() => {
    if (!hasTutorialSeen && !initialRoomId) {
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasTutorialSeen, initialRoomId]);

  const saveRecentRoom = useCallback((roomId: string, roomName: string, roomHost: string) => {
    const newRoom: RecentRoom = { id: roomId, name: roomName, host: roomHost, lastJoined: Date.now() };
    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => r.id !== roomId);
      const updated = [newRoom, ...filtered].slice(0, 5);
      localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleJoinRoom = useCallback(
    (roomId: string, roomSettings?: RoomSettings) => {
      if (!username.trim()) {
        setPendingRoom({ roomId, settings: roomSettings });
        return;
      }
      setPendingRoom(null);
      setIsLoading(true);
      saveRecentRoom(roomId, roomSettings?.name || roomId, host);
      onJoin(host, roomId, username.trim(), roomSettings);
    },
    [username, host, onJoin, saveRecentRoom]
  );

  const handleCreateRoom = useCallback(
    (roomId: string, settings: RoomSettings) => {
      setShowCreateRoom(false);
      handleJoinRoom(roomId, settings);
    },
    [handleJoinRoom]
  );

  const handleQuickJoin = useCallback(() => {
    const roomId = generateRoomId();
    handleJoinRoom(roomId, { name: roomId, isPublic: true, maxPlayers: 6 });
  }, [handleJoinRoom]);

  // Track if auto-join has been attempted for current pending room
  const [attemptedJoinForRoom, setAttemptedJoinForRoom] = useState<string | null>(null);

  // Auto-join when username is entered and there's a pending room
  if (pendingRoom && username.trim() && attemptedJoinForRoom !== pendingRoom.roomId) {
    setAttemptedJoinForRoom(pendingRoom.roomId);
    // Schedule the join for next tick to avoid setState during render
    queueMicrotask(() => {
      handleJoinRoom(pendingRoom.roomId, pendingRoom.settings);
    });
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-[#050508] to-black" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />

      <AnimatePresence>
        {showCreateRoom && (
          <CreateRoomDialog onClose={() => setShowCreateRoom(false)} onCreate={handleCreateRoom} host={host} />
        )}
        {showJoinByCode && (
          <JoinByCodeDialog
            onClose={() => setShowJoinByCode(false)}
            onJoin={(roomId) => {
              setShowJoinByCode(false);
              handleJoinRoom(roomId);
            }}
          />
        )}
        {showShare && <ShareDialog roomId={showShare.roomId} host={showShare.host} onClose={() => setShowShare(null)} />}
      </AnimatePresence>

      <TutorialModal
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          markTutorialSeen();
        }}
      />

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-amber-100 tracking-wide">Wizard</h1>
          <p className="text-amber-200/50 text-sm mt-1">The trick-taking card game</p>
          <button
            onClick={() => setShowTutorial(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
            How to Play
          </button>
        </div>

        {/* Username */}
        <div className="relative mb-4">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-500/20 to-transparent rounded-2xl blur-sm" />
          <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl p-6">
            <label className="block text-sm font-medium text-amber-200/70 mb-2">Your name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-[#0a0a15] text-amber-100 rounded-xl border border-amber-500/20 placeholder-amber-200/30 hover:border-amber-500/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-text"
              autoFocus={!username}
            />
            {pendingRoom && !username.trim() && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-amber-400 text-sm mt-2 flex items-center gap-1.5"
              >
                <Info className="w-4 h-4" />
                Enter your name to join room: {pendingRoom.roomId}
              </motion.p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="relative mb-4">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-500/10 to-transparent rounded-2xl blur-sm" />
          <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl p-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={handleQuickJoin}
                disabled={!username.trim() || isLoading}
                className="py-4 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Quick Play
              </button>
              <button
                onClick={() => setShowCreateRoom(true)}
                disabled={!username.trim()}
                className="py-4 bg-[#15152a] hover:bg-[#1a1a30] disabled:opacity-50 disabled:cursor-not-allowed text-amber-200 rounded-xl font-medium transition-all cursor-pointer active:scale-[0.98] border border-amber-500/20 hover:border-amber-500/40 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Room
              </button>
            </div>
            <button
              onClick={() => setShowJoinByCode(true)}
              className="w-full py-3 bg-[#0a0a15] hover:bg-[#15152a] text-amber-200/70 hover:text-amber-200 rounded-xl font-medium transition-all cursor-pointer border border-amber-500/20 hover:border-amber-500/40 flex items-center justify-center gap-2"
            >
              <Hash className="w-5 h-5" />
              Join by Code
            </button>
          </div>
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <motion.div className="relative mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl blur-sm" />
            <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl p-6">
              <h3 className="text-sm font-medium text-amber-400/60 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Rooms
              </h3>
              <div className="space-y-2">
                {recentRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={!username.trim()}
                    className="w-full p-3 bg-[#0a0a15] hover:bg-[#15152a] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-amber-500/10 hover:border-amber-500/30 transition-all text-left flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="text-amber-100 font-medium">{room.name}</div>
                      <div className="text-xs text-amber-400/40 font-mono">{room.id}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400/40 group-hover:text-amber-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Advanced */}
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-b from-amber-500/5 to-transparent rounded-2xl blur-sm" />
          <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 text-left text-amber-200/50 hover:text-amber-200 transition-colors flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4" />
                Advanced options
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-amber-500/10 pt-4">
                    <label className="block text-sm font-medium text-amber-200/70 mb-2">Server</label>
                    <input
                      type="text"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0a0a15] text-amber-100/70 rounded-xl border border-amber-500/20 font-mono text-sm hover:border-amber-500/40 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-text"
                    />
                    <p className="text-xs text-amber-200/30 mt-2">Default: localhost:1999 for local development</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-amber-200/40 text-xs">
            Made with <span className="text-red-400">♥</span> by{' '}
            <a
              href="https://rabitem.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              rabitem.de
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
