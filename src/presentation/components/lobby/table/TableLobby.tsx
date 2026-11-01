'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { RoundTable } from './RoundTable';
import { InvitedStrip, LobbyBottomBar, LobbyTopBar, RulesChips } from './LobbyChrome';
import { ConnectionBanner, LobbyToasts } from './LobbyStates';
import { LobbyScene } from '../skins/LobbyDecor';
import type { LobbyActivityView, LobbyInviteView, LobbySeatView, RuleChip, StartReadiness } from './lobby-view.types';

export interface TableLobbyProps {
  roomId: string;
  isPublic: boolean;
  isHost: boolean;
  isConnected: boolean;
  seats: LobbySeatView[];
  maxPlayers: number;
  palette: TableThemePalette;
  ruleChips: RuleChip[];
  highlightRuleId: string | null;
  invites: LobbyInviteView[];
  canInvite: boolean;
  readiness: StartReadiness;
  isStarting: boolean;
  activity: LobbyActivityView[];
  onStart: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  onCopyLink: () => Promise<void> | void;
  onShare: () => void;
  onOpenSettings: () => void;
  onOpenInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onSeatClick: (seat: LobbySeatView) => void;
  onEmptySeatClick: (seatNumber: number) => void;
}

/** Presentational round-table lobby; the container wires game state, invites and sheets. */
export function TableLobby(props: TableLobbyProps) {
  const localSeat = props.seats.find((seat) => seat.isLocal);
  return (
    <>
      <ConnectionBanner isConnected={props.isConnected} />
      <LobbyToasts items={props.activity} />
      <div className="relative z-10 isolate max-w-lg mx-auto px-4 sm:px-6 pt-5 sm:pt-8 min-h-[100dvh] flex flex-col">
        {/* Theme vignette behind the top bar and the far side of the table (renders nothing without a skin). */}
        <div className="pointer-events-none absolute inset-x-4 sm:inset-x-6 top-5 sm:top-8 h-[150px] sm:h-[170px] isolate">
          <LobbyScene />
        </div>
        <LobbyTopBar
          roomId={props.roomId}
          isPublic={props.isPublic}
          isHost={props.isHost}
          onCopyLink={props.onCopyLink}
          onShare={props.onShare}
          onOpenSettings={props.onOpenSettings}
        />
        <RoundTable seats={props.seats} maxPlayers={props.maxPlayers} palette={props.palette} onSeatClick={props.onSeatClick} onEmptySeatClick={props.onEmptySeatClick} />
        <div className="space-y-3">
          <InvitedStrip invites={props.invites} canInvite={props.canInvite} onRevoke={props.onRevokeInvite} onInvite={props.onOpenInvite} />
          <RulesChips chips={props.ruleChips} highlightId={props.highlightRuleId} onOpen={props.onOpenSettings} />
        </div>
        <div className="flex-1" />
        <LobbyBottomBar
          isHost={props.isHost}
          isReady={localSeat?.isReady ?? false}
          readiness={props.readiness}
          playerCount={props.seats.length}
          isStarting={props.isStarting}
          onStart={props.onStart}
          onToggleReady={props.onToggleReady}
          onLeave={props.onLeave}
        />
      </div>
    </>
  );
}
