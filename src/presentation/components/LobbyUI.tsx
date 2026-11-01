'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { DEFAULT_ROOM_SETTINGS, type IGameState } from '@shared/domain';
import { AVATAR_PRESETS } from './settings';
import { ShareModal } from './lobby';
import { useAvatarId } from './account/PlayerAvatar';
import {
  InviteSheet,
  OpenSeatSheet,
  SeatActionSheet,
  TableLobby,
  TableSettingsSheet,
  buildSeatViews,
  startReadiness,
  summarizeRules,
  type LobbyFriendView,
  type LobbyInviteView,
  type LobbySeatView,
  type SeatAccount,
} from './lobby/table';
import { useChangedRuleHighlight, useLobbyToasts } from './lobby/table/useLobbyFeedback';
import { AmbientParticles } from './room-browser';
import { ClassicAmbienceOnly } from './ui';
import { SeatFriendAction } from './friends';
import { TournamentTableLobby } from './tournament/in-game';
import { useSocialActions } from './friends/useSocialActions';
import { useSelectedTableTheme } from './table/table-theme';
import { useGame } from '../providers/GameProvider';
import { useSocial } from '../providers/SocialProvider';
import { useAccount } from '../providers/AccountProvider';
import { useTournamentTable } from '../providers/TournamentTableProvider';
import { useSentInvites } from '../hooks/social/useSentInvites';
import type { SentInviteDto } from '@/app/api/types/social-invites.types';

type Sheet =
  | { kind: 'seat'; seatId: string }
  | { kind: 'open-seat'; seatNumber: number }
  | { kind: 'invite' }
  | { kind: 'settings' }
  | { kind: 'share' };

const FALLBACK_AVATARS = AVATAR_PRESETS.map((preset) => preset.id);

function shareUrlFor(roomId: string): string {
  return typeof window === 'undefined' ? `/?room=${roomId}` : `${window.location.origin}/?room=${roomId}`;
}

function toInviteView(invite: SentInviteDto): LobbyInviteView {
  return {
    id: invite.id,
    name: invite.recipient.displayName,
    avatarId: invite.recipient.avatarId ?? 'wizard',
    state: invite.state,
    expiresAt: Date.parse(invite.expiresAt),
  };
}

function graceDeadlines(gameState: IGameState): Map<string, number> {
  return new Map((gameState.graceStates ?? []).map(([playerId, grace]) => [playerId, grace.gracedAt + grace.graceDuration]));
}

interface LobbyUIProps {
  gameState: IGameState;
  localPlayerId: string;
}

/** The lobby of a room: a tournament table's waiting room (the worker seats and starts it), or the round table. */
export function LobbyUI(props: LobbyUIProps) {
  const { match } = useTournamentTable();
  return match ? <TournamentTableLobby match={match} gameState={props.gameState} /> : <RoundTableLobby {...props} />;
}

/**
 * Container for the round-table lobby: turns game state, seat accounts, friends and sent invites
 * into view data, and owns which sheet is open. Rendering lives in `lobby/table`.
 */
function RoundTableLobby({ gameState, localPlayerId }: LobbyUIProps) {
  const {
    isConnected, startGame, leaveGame, addBot, removeBot, setRuleset, setRoomSettings, setReady, kickPlayer, transferHost, lobbyActivity,
  } = useGame();
  const { enabled: socialEnabled, friends, roomAccounts } = useSocial();
  const { invite, busy, error: inviteError, notice: inviteNotice } = useSocialActions();
  const sentInvites = useSentInvites(socialEnabled ? gameState.id : null);
  const palette = useSelectedTableTheme();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { status: accountStatus } = useAccount();
  const localAvatar = useAvatarId();

  const roomSettings = gameState.roomSettings ?? DEFAULT_ROOM_SETTINGS;
  const ruleset = gameState.rulesetConfig ?? roomSettings.rulesetConfig;
  const isHost = gameState.hostId === localPlayerId;
  const close = useCallback(() => setSheet(null), []);

  const accounts = useMemo(() => {
    const map = new Map<string, SeatAccount>();
    roomAccounts.forEach((seat, playerId) => map.set(playerId, { avatar: seat.player.avatar, level: seat.player.level }));
    return map;
  }, [roomAccounts]);

  const seats = useMemo(
    () => buildSeatViews({
      players: gameState.players,
      hostId: gameState.hostId,
      localPlayerId,
      localAvatarId: localAvatar,
      localIsGuest: accountStatus === 'guest',
      fallbackAvatarIds: FALLBACK_AVATARS,
      accounts,
      graceEndsAt: graceDeadlines(gameState),
    }),
    [gameState, localPlayerId, localAvatar, accountStatus, accounts]
  );
  const hostName = seats.find((seat) => seat.isHost)?.name ?? 'The host';
  const localSeat = seats.find((seat) => seat.isLocal);
  const ruleChips = useMemo(() => summarizeRules(ruleset ?? DEFAULT_ROOM_SETTINGS.rulesetConfig!), [ruleset]);
  const highlightRuleId = useChangedRuleHighlight(ruleChips);
  const invites = useMemo(() => sentInvites.invites.map(toInviteView), [sentInvites.invites]);
  const toasts = useLobbyToasts(lobbyActivity, invites, localSeat?.name ?? null);

  const friendViews = useMemo<LobbyFriendView[]>(() => {
    const seatedUserIds = new Set([...roomAccounts.values()].map((seat) => seat.player.userId));
    const latestInvite = new Map<string, SentInviteDto>();
    for (const sent of sentInvites.invites) if (!latestInvite.has(sent.recipient.userId)) latestInvite.set(sent.recipient.userId, sent);
    return friends.map((friend) => {
      const sent = latestInvite.get(friend.userId);
      return {
        userId: friend.userId,
        name: friend.displayName,
        avatarId: friend.avatar ?? 'wizard',
        level: friend.level,
        presence: friend.presence.status,
        activity: friend.presence.activity,
        inviteId: sent?.id ?? null,
        inviteState: sent?.state ?? null,
        isSeated: seatedUserIds.has(friend.userId),
      };
    });
  }, [friends, roomAccounts, sentInvites.invites]);

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrlFor(gameState.id));
  }, [gameState.id]);

  const handleStart = useCallback(() => {
    setIsStarting(true);
    startGame();
    // The game screen replaces the lobby on success; re-enable the button if the start was refused.
    setTimeout(() => setIsStarting(false), 5000);
  }, [startGame]);

  // A sent invite refreshes useSentInvites through its invite-sent event.
  const handleInvite = useCallback((friend: LobbyFriendView) => {
    void invite(friend.userId, gameState.id, friend.name);
  }, [invite, gameState.id]);

  const openSeat = sheet?.kind === 'seat' ? seats.find((seat) => seat.id === sheet.seatId) : undefined;

  return (
    <div className="min-h-full">
      <ClassicAmbienceOnly><AmbientParticles /></ClassicAmbienceOnly>

      <TableLobby
        roomId={gameState.id}
        isPublic={roomSettings.isPublic}
        isHost={isHost}
        isConnected={isConnected}
        seats={seats}
        maxPlayers={roomSettings.maxPlayers}
        palette={palette}
        ruleChips={ruleChips}
        highlightRuleId={highlightRuleId}
        invites={invites}
        canInvite={socialEnabled}
        readiness={startReadiness(seats, hostName, isHost)}
        isStarting={isStarting}
        activity={toasts}
        onStart={handleStart}
        onToggleReady={() => setReady(!(localSeat?.isReady ?? false))}
        onLeave={leaveGame}
        onCopyLink={copyLink}
        onShare={() => setSheet({ kind: 'share' })}
        onOpenSettings={() => setSheet({ kind: 'settings' })}
        onOpenInvite={() => setSheet({ kind: 'invite' })}
        onRevokeInvite={sentInvites.revoke}
        // Every seat action targets someone else; your own avatar is chosen in the account.
        onSeatClick={(seat: LobbySeatView) => { if (!seat.isLocal) setSheet({ kind: 'seat', seatId: seat.id }); }}
        onEmptySeatClick={(seatNumber) => setSheet({ kind: 'open-seat', seatNumber })}
      />

      <AnimatePresence>
        {openSeat ? (
          <SeatActionSheet
            key="seat"
            seat={openSeat}
            isHost={isHost}
            friendAction={openSeat.hasAccount && !openSeat.isLocal ? <SeatFriendAction gamePlayerId={openSeat.id} /> : undefined}
            onClose={close}
            onKick={() => { kickPlayer(openSeat.id); close(); }}
            onMakeHost={() => { transferHost(openSeat.id); close(); }}
            onRemoveBot={() => { removeBot(openSeat.id); close(); }}
          />
        ) : null}
        {sheet?.kind === 'open-seat' ? (
          <OpenSeatSheet
            key="open-seat"
            seatNumber={sheet.seatNumber}
            isHost={isHost}
            canInviteFriends={socialEnabled}
            onClose={close}
            onInviteFriends={() => setSheet({ kind: 'invite' })}
            onCopyLink={async () => { await copyLink(); close(); }}
            onAddBot={(difficulty) => { addBot(difficulty); close(); }}
          />
        ) : null}
        {sheet?.kind === 'invite' ? (
          <InviteSheet
            key="invite"
            friends={friendViews}
            isLoading={sentInvites.isLoading && friends.length === 0}
            shareUrl={shareUrlFor(gameState.id)}
            busyUserId={busy?.startsWith('invite:') ? busy.slice('invite:'.length) : null}
            message={inviteError ? { tone: 'error', text: inviteError } : inviteNotice ? { tone: 'info', text: inviteNotice } : null}
            onInvite={handleInvite}
            onRevoke={sentInvites.revoke}
            onCopyLink={copyLink}
            onClose={close}
          />
        ) : null}
        {sheet?.kind === 'settings' ? (
          <TableSettingsSheet
            key="settings"
            isHost={isHost}
            isPublic={roomSettings.isPublic}
            maxPlayers={roomSettings.maxPlayers}
            seatedCount={seats.length}
            rulesetConfig={ruleset ?? DEFAULT_ROOM_SETTINGS.rulesetConfig!}
            onVisibilityChange={(isPublic) => setRoomSettings({ ...roomSettings, isPublic })}
            onMaxPlayersChange={(maxPlayers) => setRoomSettings({ ...roomSettings, maxPlayers })}
            onRulesetChange={setRuleset}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
      {sheet?.kind === 'share' ? <ShareModal roomId={gameState.id} onClose={close} /> : null}
    </div>
  );
}
