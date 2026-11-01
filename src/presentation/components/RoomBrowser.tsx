'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'motion/react';
import { safeLocalStorage } from '@/lib/storage';
import { TutorialModal, useTutorialSeen } from './TutorialModal';
import {
  ShareDialog,
  CreateRoomDialog,
  AmbientParticles,
  HeroSection,
  RealmSwitcher,
  PlayCard,
  LearnToPlaySection,
  TournamentsSection,
  RecentRoomsSection,
  HowToWinSection, ExpansionShowcaseSection,
  FooterSection,
  generateRoomId,
  RECENT_ROOMS_KEY,
  getDefaultHost,
  type RoomSettings,
  type RecentRoom,
} from './room-browser';
import { normalizePartyHostInput } from './room-browser/room-host';
import { parseRoomCodeInput } from './room-browser/room-code';
import { GlobalStatsPanel } from './GlobalStatsPanel';
import { HallOfChampions } from './hall-of-champions';
import { RealmPulse } from './realm-pulse';
import { ClassicAmbienceOnly } from './ui';
import { useGame } from '../providers/GameProvider';
import { useAccount } from '../providers/AccountProvider';
import { AccountButton, GuestHint, PreferencesButton } from './account';
import { SocialButton } from './friends';
import { useUsernameValidation } from '../hooks/useUsernameValidation';
import { usePlayerName } from '../hooks/usePlayerName';

const RECENT_ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECENT_ROOMS = 5;

function isRecentRoom(value: unknown): value is RecentRoom {
  if (!value || typeof value !== 'object') return false;
  const room = value as Partial<Record<keyof RecentRoom, unknown>>;
  return typeof room.id === 'string' && typeof room.lastJoined === 'number';
}

function loadRecentRooms(): RecentRoom[] {
  if (typeof window === 'undefined') return [];
  const rooms = safeLocalStorage.readJson(RECENT_ROOMS_KEY);
  if (!Array.isArray(rooms)) return [];
  const now = Date.now();
  return rooms.filter(isRecentRoom).filter((r) => now - r.lastJoined < RECENT_ROOM_TTL_MS).slice(0, MAX_RECENT_ROOMS);
}

/** Hook for managing room joining and recent rooms */
function useRoomManager(connect: ReturnType<typeof useGame>['connect'], username: string, host: string) {
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setRecentRooms(loadRecentRooms());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveRecentRoom = useCallback((roomId: string, roomName: string, roomHost: string) => {
    const newRoom: RecentRoom = { id: roomId, name: roomName, host: roomHost, lastJoined: Date.now() };
    setRecentRooms((prev) => {
      const filtered = prev.filter((r) => r.id !== roomId);
      const updated = [newRoom, ...filtered].slice(0, MAX_RECENT_ROOMS);
      safeLocalStorage.writeJson(RECENT_ROOMS_KEY, updated);
      return updated;
    });
  }, []);

  const handleJoinRoom = useCallback((roomId: string, roomSettings?: RoomSettings) => {
    const name = username.trim();
    if (!name) return false;
    const normalizedHost = normalizePartyHostInput(host) || host;
    setIsLoading(true);
    saveRecentRoom(roomId, roomSettings?.name || roomId, normalizedHost);
    connect(normalizedHost, roomId, name, roomSettings);
    return true;
  }, [username, host, connect, saveRecentRoom]);

  return { recentRooms, isLoading, handleJoinRoom };
}

interface RoomBrowserDialogsProps {
  showCreateRoom: boolean;
  showShare: { roomId: string } | null;
  host: string;
  onCreateRoomClose: () => void;
  onCreateRoom: (roomId: string, settings: RoomSettings) => void;
  onShareClose: () => void;
}

function RoomBrowserDialogs({
  showCreateRoom,
  showShare,
  host,
  onCreateRoomClose,
  onCreateRoom,
  onShareClose,
}: RoomBrowserDialogsProps) {
  return (
    <AnimatePresence>
      {showCreateRoom ? <CreateRoomDialog onClose={onCreateRoomClose} onCreate={onCreateRoom} host={host} /> : null}
      {showShare ? <ShareDialog roomId={showShare.roomId} onClose={onShareClose} /> : null}
    </AnimatePresence>
  );
}

interface RoomBrowserContentProps {
  playCard: React.ComponentProps<typeof PlayCard>;
  openTutorial: () => void;
  recentRooms: RecentRoom[];
  handleJoinRoom: (roomId: string, roomSettings?: RoomSettings) => void;
}

function RoomBrowserContent({
  playCard,
  openTutorial,
  recentRooms,
  handleJoinRoom,
}: RoomBrowserContentProps) {
  return (
    <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex justify-end gap-2 mb-2 sm:mb-0 sm:absolute sm:top-6 sm:right-6">
        <SocialButton />
        <PreferencesButton />
        <AccountButton />
      </div>
      <HeroSection />
      <RealmSwitcher />
      <PlayCard {...playCard} />
      <GuestHint className="-mt-3 sm:-mt-4 mb-6 sm:mb-8" />
      <RealmPulse />
      <TournamentsSection />
      <LearnToPlaySection onOpenTutorial={openTutorial} />
      <RecentRoomsSection recentRooms={recentRooms} canPlay={playCard.identity.accountStatus !== 'loading'} onJoinRoom={handleJoinRoom} />
      <HallOfChampions />
      <GlobalStatsPanel />
      <HowToWinSection />
      <ExpansionShowcaseSection />
      <FooterSection />
    </div>
  );
}

/** The play card's view of who is playing: the username when signed in, else the guest's name. */
function usePlayCardIdentity() {
  const { status, overview } = useAccount();
  const { name, ready, setGuestName } = usePlayerName();
  return {
    username: name,
    isReady: ready,
    identity: { accountStatus: status, accountLevel: overview?.progression.level, name, onNameChange: setGuestName },
  };
}

type PendingRoom = { roomId: string; settings?: RoomSettings };

function pendingRoomFromLink(roomParam: string | undefined): PendingRoom | null {
  const roomId = roomParam ? parseRoomCodeInput(roomParam) : '';
  return roomId ? { roomId } : null;
}

export function RoomBrowser() {
  const searchParams = useSearchParams();
  const initialRoomId = searchParams.get('room') || undefined;
  const initialHost = searchParams.get('host') || undefined;

  const { connect } = useGame();
  const { username, isReady: isNameReady, identity } = usePlayCardIdentity();
  const [host] = useState(() => initialHost || getDefaultHost());
  const { recentRooms, isLoading, handleJoinRoom: joinRoom } = useRoomManager(connect, username, host);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showShare, setShowShare] = useState<{ roomId: string } | null>(null);
  const [pendingRoom, setPendingRoom] = useState<PendingRoom | null>(() => pendingRoomFromLink(initialRoomId));
  const [lastInitialRoomId, setLastInitialRoomId] = useState(initialRoomId);
  const [showTutorial, setShowTutorial] = useState(false);
  const { hasSeen: hasTutorialSeen, markAsSeen: markTutorialSeen } = useTutorialSeen();
  const { status: usernameStatus, isChecking, isTaken, checkUsername } = useUsernameValidation();
  const [autoJoinCheckedFor, setAutoJoinCheckedFor] = useState<string | null>(null);

  if (initialRoomId !== lastInitialRoomId) {
    setLastInitialRoomId(initialRoomId);
    if (initialRoomId) setPendingRoom(pendingRoomFromLink(initialRoomId));
  }

  useEffect(() => { checkUsername(username); }, [username, checkUsername]);
  useEffect(() => { if (!hasTutorialSeen && !initialRoomId) { const timer = setTimeout(() => setShowTutorial(true), 500); return () => clearTimeout(timer); } }, [hasTutorialSeen, initialRoomId]);

  const handleJoinRoom = useCallback((roomId: string, roomSettings?: RoomSettings) => {
    if (!username.trim()) {
      // Keep the room and ask for a name in the play card instead of dropping the click.
      setPendingRoom({ roomId, settings: roomSettings });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    joinRoom(roomId, roomSettings);
  }, [username, joinRoom]);

  const handleCreateRoom = useCallback((roomId: string, settings: RoomSettings) => { setShowCreateRoom(false); handleJoinRoom(roomId, settings); }, [handleJoinRoom]);
  const handleQuickJoin = useCallback(() => { const roomId = generateRoomId(); handleJoinRoom(roomId, { name: roomId, isPublic: true, maxPlayers: 6 }); }, [handleJoinRoom]);
  const handleJoinByCode = useCallback((roomId: string) => {
    handleJoinRoom(roomId, pendingRoom?.roomId === roomId ? pendingRoom.settings : undefined);
  }, [handleJoinRoom, pendingRoom]);

  // Invite links join straight away when the name is already known (account or saved guest
  // name). Otherwise the room waits in the play card until the player has picked a name.
  if (pendingRoom && isNameReady && autoJoinCheckedFor !== pendingRoom.roomId) {
    setAutoJoinCheckedFor(pendingRoom.roomId);
    if (username.trim()) queueMicrotask(() => joinRoom(pendingRoom.roomId, pendingRoom.settings));
  }

  const canPlay = username.trim().length > 0 && !isTaken;

  return (
    <div className="min-h-screen">
      {/* Root stays transparent: SeasonalAmbience paints the page and owns seasonal particles */}
      <ClassicAmbienceOnly><AmbientParticles /></ClassicAmbienceOnly>

      <RoomBrowserDialogs
        showCreateRoom={showCreateRoom}
        showShare={showShare}
        host={host}
        onCreateRoomClose={() => setShowCreateRoom(false)}
        onCreateRoom={handleCreateRoom}
        onShareClose={() => setShowShare(null)}
      />

      <TutorialModal
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          markTutorialSeen();
        }}
      />

      <RoomBrowserContent
        playCard={{
          identity,
          validation: { status: usernameStatus, isChecking, isTaken },
          canPlay,
          isLoading,
          pendingRoomId: pendingRoom?.roomId ?? null,
          onQuickJoin: handleQuickJoin,
          onJoinByCode: handleJoinByCode,
          onCreateRoom: () => setShowCreateRoom(true),
        }}
        openTutorial={() => setShowTutorial(true)}
        recentRooms={recentRooms}
        handleJoinRoom={handleJoinRoom}
      />
    </div>
  );
}
