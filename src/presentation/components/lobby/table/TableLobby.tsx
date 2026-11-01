'use client';

import type { TableThemePalette } from '@/presentation/config/table-theme.config';
import { RoundTable } from './RoundTable';
import { LobbyRoster } from './LobbyRoster';
import { InvitedStrip, LobbyBottomBar, LobbyTopBar, RulesChips } from './LobbyChrome';
import { ConnectionBanner, LobbyToasts } from './LobbyStates';
import { LobbyPanelBackdrop, LobbyPanelDecor, LobbyScene } from '../skins/LobbyDecor';
import { LOBBY_GRID_CLASS, LOBBY_PAGE_CLASS, LOBBY_SLOT, SERIF } from './lobby-styles';
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
      <div className={LOBBY_PAGE_CLASS}>
        <div className={LOBBY_GRID_CLASS}>
          {/* Theme vignette behind the top bar and the far side of the table (renders nothing without a skin). */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[150px] sm:h-[170px] split:h-[220px] isolate">
            <LobbyScene />
          </div>
          <div aria-hidden className={LOBBY_SLOT.panel}>
            <LobbyPanelBackdrop variant="rules" />
            <LobbyPanelDecor variant="rules" />
          </div>
          <LobbyTopBar
            className={LOBBY_SLOT.top}
            roomId={props.roomId}
            isPublic={props.isPublic}
            isHost={props.isHost}
            onCopyLink={props.onCopyLink}
            onShare={props.onShare}
            onOpenSettings={props.onOpenSettings}
          />
          <RoundTable seats={props.seats} maxPlayers={props.maxPlayers} palette={props.palette} onSeatClick={props.onSeatClick} onEmptySeatClick={props.onEmptySeatClick} />
          <LobbyRoster className={LOBBY_SLOT.roster} seats={props.seats} maxPlayers={props.maxPlayers} onSeatClick={props.onSeatClick} onEmptySeatClick={props.onEmptySeatClick} />
          <div className={`flex flex-col gap-3 ${LOBBY_SLOT.info}`}>
            {/* The panel lists the rules first; phones keep invites above the rules. */}
            <h2 className="hidden split:block text-amber-100 text-sm" style={SERIF}>Table rules</h2>
            <div className="empty:hidden split:order-last split:pt-2">
              <InvitedStrip invites={props.invites} canInvite={props.canInvite} onRevoke={props.onRevokeInvite} onInvite={props.onOpenInvite} />
            </div>
            <RulesChips chips={props.ruleChips} highlightId={props.highlightRuleId} onOpen={props.onOpenSettings} />
          </div>
          <LobbyBottomBar
            className={LOBBY_SLOT.actions}
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
      </div>
    </>
  );
}
