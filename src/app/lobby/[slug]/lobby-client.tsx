'use client';

import { useState, useCallback, useSyncExternalStore, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight } from 'lucide-react';
import { GamePhase } from '@shared/domain';
import { useGame } from '@/presentation/providers/GameProvider';
import { LobbyUI } from '@/presentation/components/LobbyUI';
import { JoiningScreen, LobbyErrorScreen, LobbySkeleton, classifyLobbyError, type JoinStep } from '@/presentation/components/lobby/table';
import { getDefaultHost } from '@/presentation/components/room-browser/utils';
import {
  clearPendingRoomSetupForRoom,
  getPendingRoomSetupForRoom,
} from '@/presentation/components/room-browser/pending-room';
import { normalizePartyHostInput } from '@/presentation/components/room-browser/room-host';
import { ConnectionStatusOverlay } from '@/presentation/components/overlays';
import { SeasonalCorner } from '@/presentation/components/seasonal';
import { TournamentJoinGate } from '@/presentation/components/tournament/in-game';
import { usePlayerName } from '@/presentation/hooks/usePlayerName';
import type { RoomSettings } from '@/presentation/types';

import {
  calcCanAutoRejoin,
  calcEffectiveIsJoining,
  calcIsAutoRejoining,
  getAutoRejoinEffectAction,
  shouldResetManualJoin,
  type AutoRejoinState,
} from './lobby-join-decisions';

function useHasMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

interface AutoRejoinParams {
  canAutoRejoin: boolean;
  /** Ready to decide, but the client already holds a connection (the provider restored it). */
  isAlreadyConnecting: boolean;
  autoRejoinState: AutoRejoinState;
  setAutoRejoinState: (state: AutoRejoinState) => void;
  error: string | null;
  connect: (host: string, slug: string, name: string, roomSettings?: RoomSettings) => void;
  getJoinSetup: () => { host: string; roomSettings?: RoomSettings };
  slug: string;
  savedUsername: string;
}

/** Hook for auto-rejoin effects */
function useAutoRejoinEffects(params: AutoRejoinParams) {
  const { canAutoRejoin, isAlreadyConnecting, autoRejoinState, setAutoRejoinState, error, connect, getJoinSetup, slug, savedUsername } = params;

  // Store connect function in ref to avoid effect loop
  const connectRef = useRef(connect);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Decide once per visit: join from the saved name, or leave the existing connection alone for good
  useEffect(() => {
    const action = getAutoRejoinEffectAction({ canAutoRejoin, isAlreadyConnecting, autoRejoinState, error });
    if (action === 'skip') {
      setAutoRejoinState('skipped');
    } else if (action === 'join') {
      setAutoRejoinState('triggered');
      const { host, roomSettings } = getJoinSetup();
      connectRef.current(host, slug, savedUsername, roomSettings);
    }
  }, [canAutoRejoin, isAlreadyConnecting, autoRejoinState, error, getJoinSetup, slug, savedUsername, setAutoRejoinState]);

  // Mark as failed if error occurs during triggered state
  useEffect(() => {
    if (getAutoRejoinEffectAction({ canAutoRejoin, autoRejoinState, error }) === 'mark-failed') {
      setAutoRejoinState('failed');
    }
  }, [canAutoRejoin, error, autoRejoinState, setAutoRejoinState]);
}

/** Hook for manual join reset effect */
function useManualJoinResetEffect(
  manualJoinTriggered: boolean,
  setManualJoinTriggered: (v: boolean) => void,
  error: string | null,
  isConnected: boolean,
  isCorrectRoom: boolean
) {
  useEffect(() => {
    if (shouldResetManualJoin({ manualJoinTriggered, error, isConnected, isCorrectRoom })) {
      setManualJoinTriggered(false);
    }
  }, [manualJoinTriggered, error, isConnected, isCorrectRoom, setManualJoinTriggered]);
}

/** Hook for wrong room redirect effect */
function useWrongRoomRedirect(
  isConnected: boolean,
  gameState: ReturnType<typeof useGame>['gameState'],
  isCorrectRoom: boolean,
  router: ReturnType<typeof useRouter>
) {
  useEffect(() => {
    if (isConnected && gameState && !isCorrectRoom) {
      router.push('/');
    }
  }, [isConnected, gameState, isCorrectRoom, router]);
}

const JOIN_CARD_CORNER_SIZE = 28;

interface LobbyClientProps {
  slug: string;
}

/** Loading screen for game start transition */
function GameStartingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-amber-400/70">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span style={{ fontFamily: 'Georgia, serif' }}>Starting game...</span>
      </div>
    </div>
  );
}

/** Page footer with privacy/imprint links */
function PageFooter() {
  return (
    <footer className="text-center py-6">
      <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs" style={{ fontFamily: 'Georgia, serif' }}>
        <Link href="/privacy" className="text-amber-600/30 hover:text-amber-400 transition-colors">Privacy</Link>
        <span className="text-amber-700/20">·</span>
        <Link href="/imprint" className="text-amber-600/30 hover:text-amber-400 transition-colors">Imprint</Link>
      </div>
    </footer>
  );
}

/** Join form header */
function JoinFormHeader() {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl sm:text-3xl text-amber-100/95 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Join Game
      </h1>
      <p className="text-amber-500/50 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
        Enter your name to join the room
      </p>
    </div>
  );
}

/** Room code display */
function RoomCodeSection({ slug }: { slug: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
        <span className="text-amber-400/70 text-xs uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>Room Code</span>
      </div>
      <div className="font-mono text-xl text-amber-300 text-center py-3 rounded-xl border border-amber-700/30 tracking-widest" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)' }}>{slug}</div>
    </div>
  );
}

/** Character counter */
function CharCounter({ length, hasMounted }: { length: number; hasMounted: boolean }) {
  if (!hasMounted || length === 0) return null;
  return <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono" style={{ color: length >= 18 ? 'var(--color-amber-500)' : 'color-mix(in srgb, var(--text-muted) 50%, transparent)' }}>{length}/20</span>;
}

/** Name input section; a signed-in player's name is their account name and read-only. */
function NameInputSection({ playerName, isAccountName, setUserInput, handleKeyDown, effectiveIsJoining, hasMounted }: { playerName: string; isAccountName: boolean; setUserInput: (v: string) => void; handleKeyDown: (e: React.KeyboardEvent) => void; effectiveIsJoining: boolean; hasMounted: boolean }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
        <span className="text-amber-400/70 text-xs uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>Your Name</span>
      </div>
      <div className="relative">
        <input type="text" value={playerName} onChange={(e) => setUserInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Enter your wizard name..." maxLength={20} readOnly={isAccountName} aria-describedby={isAccountName ? 'account-name-hint' : undefined} disabled={effectiveIsJoining} className="w-full px-4 py-3 rounded-xl border border-amber-700/30 placeholder-amber-600/30 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all text-sm disabled:opacity-50" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)', fontFamily: 'Georgia, serif', color: 'color-mix(in srgb, var(--color-amber-100) 95%, transparent)' }} autoFocus />
        {isAccountName ? null : <CharCounter length={playerName.length} hasMounted={hasMounted} />}
      </div>
      {isAccountName ? <p id="account-name-hint" className="mt-1.5 px-1 text-[11px] text-amber-200/45" style={{ fontFamily: 'Georgia, serif' }}>Your account name. <Link href="/account?tab=profile" className="text-amber-400/80 hover:text-amber-300 underline-offset-2 hover:underline">Change it</Link> on your profile.</p> : null}
    </div>
  );
}

/** Error message display */
function ErrorMessage({ joinError }: { joinError: string | null }) {
  if (!joinError) return null;
  return <div className="mb-4 px-4 py-3 rounded-xl text-sm border border-red-500/30" style={{ background: 'color-mix(in srgb, var(--color-amber-600) 10%, transparent)', color: '#fca5a5', fontFamily: 'Georgia, serif' }}>{joinError}</div>;
}

/** Join button */
function JoinButton({ playerName, effectiveIsJoining, handleJoin }: { playerName: string; effectiveIsJoining: boolean; handleJoin: () => void }) {
  const isEnabled = playerName.trim() && !effectiveIsJoining;
  return (
    <button onClick={handleJoin} disabled={!isEnabled} className="w-full py-3.5 rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2" style={{ background: isEnabled ? 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 50%, var(--accent-cta-bottom) 100%)' : 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 30%, transparent) 0%, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 100%)', boxShadow: isEnabled ? '0 4px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none', fontFamily: 'Georgia, serif', color: isEnabled ? '#1a1510' : 'color-mix(in srgb, var(--color-amber-100) 50%, transparent)' }}>
      {effectiveIsJoining ? <><Loader2 className="w-4 h-4 animate-spin" />Joining...</> : <>Join Game<ArrowRight className="w-4 h-4" /></>}
    </button>
  );
}

/** Home link */
function HomeLink() {
  return (
    <div className="mt-4 text-center">
      <Link href="/" className="text-amber-500/40 text-sm hover:text-amber-400 transition-colors cursor-pointer" style={{ fontFamily: 'Georgia, serif' }}>or create a new game</Link>
    </div>
  );
}

interface JoinFormCardProps { slug: string; playerName: string; isAccountName: boolean; setUserInput: (v: string) => void; handleKeyDown: (e: React.KeyboardEvent) => void; effectiveIsJoining: boolean; hasMounted: boolean; joinError: string | null; handleJoin: () => void }

/** Join form card with all input fields */
function JoinFormCard({ slug, playerName, isAccountName, setUserInput, handleKeyDown, effectiveIsJoining, hasMounted, joinError, handleJoin }: JoinFormCardProps) {
  return (
    <div className="relative rounded-xl border border-[var(--surface-border)] overflow-hidden" style={{ background: 'var(--surface)', boxShadow: '0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 8%, transparent)' }}>
      <SeasonalCorner position="top-left" size={JOIN_CARD_CORNER_SIZE} /><SeasonalCorner position="top-right" size={JOIN_CARD_CORNER_SIZE} />
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
      <div className="p-4 sm:p-6">
        <RoomCodeSection slug={slug} />
        <NameInputSection playerName={playerName} isAccountName={isAccountName} setUserInput={setUserInput} handleKeyDown={handleKeyDown} effectiveIsJoining={effectiveIsJoining} hasMounted={hasMounted} />
        <ErrorMessage joinError={joinError} />
        <JoinButton playerName={playerName} effectiveIsJoining={effectiveIsJoining} handleJoin={handleJoin} />
        <HomeLink />
      </div>
    </div>
  );
}

/**
 * The seat is in a running game: the provider routes to the table (also while the connection is
 * being restored, where the table shows that it reconnects), so the lobby only bridges the moment.
 */
function hasGameStarted(isCorrectRoom: boolean, isInLobby: boolean, playerId: string | null): boolean {
  return isCorrectRoom && !isInLobby && !!playerId;
}

/** Signed-in players always use their account name; guests may edit the remembered one. */
function resolvePlayerName(isAccountName: boolean, userInput: string | null, savedName: string): string {
  return isAccountName ? savedName : userInput ?? savedName;
}

/**
 * The seat's room, with the prompt a superseded or failed connection needs (the seat opened in
 * another tab, the retries ran out): without it the lobby would wait on a connection that the
 * client no longer restores by itself.
 */
function SeatedView({ children }: { children: React.ReactNode }) {
  const { connectionStatus, takeOverSeat, retryConnection, leaveGame } = useGame();
  return (
    <>
      {children}
      <ConnectionStatusOverlay status={connectionStatus} onTakeOver={takeOverSeat} onRetry={retryConnection} onLeave={leaveGame} />
    </>
  );
}

/** The lobby page; a seat the game worker refused at a tournament table is explained instead. */
export function LobbyClient({ slug }: LobbyClientProps) {
  return <TournamentJoinGate roomId={slug}><LobbyRoom slug={slug} /></TournamentJoinGate>;
}

function LobbyRoom({ slug }: LobbyClientProps) {
  const router = useRouter();
  const {
    isConnected,
    connectionStatus,
    sessionLoaded,
    gameState,
    playerId,
    error,
    connect,
  } = useGame();

  const hasMounted = useHasMounted();
  const { name: savedUsername, isAccountName, ready: nameReady, setGuestName } = usePlayerName();

  const [userInput, setUserInput] = useState<string | null>(null);
  const [manualJoinTriggered, setManualJoinTriggered] = useState(false);
  const [autoRejoinState, setAutoRejoinState] = useState<AutoRejoinState>('idle');

  const playerName = resolvePlayerName(isAccountName, userInput, savedUsername);
  // Wait for the account session: a signed-in player joins under their account name.
  const ready = sessionLoaded && nameReady;
  const isCorrectRoom = gameState?.id === slug;
  const isInLobby = gameState?.phase === GamePhase.LOBBY;
  const joinError = error;
  const canAutoRejoin = calcCanAutoRejoin(ready, connectionStatus, savedUsername);
  const isAlreadyConnecting = ready && connectionStatus !== 'idle';
  const getJoinSetup = useCallback(() => {
    const pendingSetup = getPendingRoomSetupForRoom(slug);
    if (pendingSetup) {
      return {
        host: pendingSetup.host,
        roomSettings: pendingSetup.settings,
      };
    }

    return {
      host: normalizePartyHostInput(getDefaultHost()) || getDefaultHost(),
    };
  }, [slug]);

  useAutoRejoinEffects({ canAutoRejoin, isAlreadyConnecting, autoRejoinState, setAutoRejoinState, error, connect, getJoinSetup, slug, savedUsername });
  useManualJoinResetEffect(manualJoinTriggered, setManualJoinTriggered, error, isConnected, isCorrectRoom);
  useWrongRoomRedirect(isConnected, gameState, isCorrectRoom, router);

  useEffect(() => {
    if (isConnected && isCorrectRoom) clearPendingRoomSetupForRoom(slug);
  }, [isConnected, isCorrectRoom, slug]);

  const isSeated = isConnected && isCorrectRoom && !!playerId;
  const isAutoRejoining = calcIsAutoRejoining({ canAutoRejoin, autoRejoinState, isConnected, error });
  const effectiveIsJoining = calcEffectiveIsJoining(manualJoinTriggered, isAutoRejoining, isSeated);

  const handleJoin = () => {
    if (!playerName.trim()) return;

    setGuestName(playerName.trim());

    setManualJoinTriggered(true);

    const { host, roomSettings } = getJoinSetup();
    connect(host, slug, playerName.trim(), roomSettings);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && playerName.trim()) {
      handleJoin();
    }
  };

  if (!ready) {
    return <LobbySkeleton />;
  }

  // The lobby stays on screen while the socket reconnects; its banner says so.
  if (gameState && playerId && isCorrectRoom && isInLobby) {
    return <SeatedView><LobbyUI gameState={gameState} localPlayerId={playerId} /></SeatedView>;
  }

  if (hasGameStarted(isCorrectRoom, isInLobby, playerId)) {
    return <SeatedView><GameStartingScreen /></SeatedView>;
  }

  const errorKind = joinError ? classifyLobbyError(joinError) : null;
  if (errorKind && errorKind !== 'generic') {
    return <LobbyErrorScreen kind={errorKind} roomId={slug} />;
  }

  if (effectiveIsJoining) {
    const step: JoinStep = !isConnected ? 'connecting' : isCorrectRoom ? 'syncing' : 'seating';
    return <JoiningScreen roomId={slug} step={step} onCancel={() => router.push('/')} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <JoinFormHeader />
          <JoinFormCard slug={slug} playerName={playerName} isAccountName={isAccountName} setUserInput={setUserInput} handleKeyDown={handleKeyDown} effectiveIsJoining={effectiveIsJoining} hasMounted={hasMounted} joinError={joinError} handleJoin={handleJoin} />
        </div>
      </div>
      <PageFooter />
    </div>
  );
}
