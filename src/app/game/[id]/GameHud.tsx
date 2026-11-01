'use client';

import { GamePhase, type IGameState } from '@shared/domain';
import {
  GameStatusBar,
  HandControls,
  HudLayout,
  HudSlot,
  InGameLeaderboard,
  MobileGameControls,
  ReactionsFeed,
  ReconnectingNotice,
  TopBarButtons,
  TurnIndicator,
  resolveStandingsMode,
} from '@/presentation/components/hud';
import { BiddingUI } from '@/presentation/components/bidding';
import { TournamentMatchBadge } from '@/presentation/components/tournament/in-game';
import { NewVersionHudNotice } from '@/presentation/components/version';
import { EmoteBar, QuickChat } from '@/presentation/components/social';
import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import type { DisplayStandings } from '@/presentation/hooks/useDisplayStandings';
import type { LayoutPolicy, StandingsMode } from '@/presentation/types/hud-layout.types';

import type { useGameClientState } from './useGameClientState';
import type { GameHudSettings } from './useGameHudSettings';
import { TurnTimerSection } from './TurnTimerSection';

type GameClientState = ReturnType<typeof useGameClientState>;

type GameHudState = Pick<
  GameClientState,
  | 'isConnected' | 'localPlayer' | 'trickResult' | 'leaderboardOpen' | 'setLeaderboardOpen' | 'setStatsOpen' | 'setSettingsOpen'
  | 'displayEmotes' | 'displayChatMessages' | 'handAnimation' | 'handleShuffle' | 'handleSort' | 'handlePlaceBid'
  | 'sendEmote' | 'sendChat' | 'sharedCustomSounds' | 'playTimeoutSound' | 'tournamentMatch'
>;

interface GameHudProps {
  state: GameHudState;
  gameState: IGameState;
  playerId: string;
  policy: LayoutPolicy;
  settings: GameHudSettings;
  standings: DisplayStandings;
  showRoundEndUI: boolean;
  interactionsDisabled: boolean;
}

interface SectionProps extends GameHudProps {
  standingsMode: StandingsMode;
}

/** Standings as a docked panel or the phone sheet; the popover lives in the top bar. */
function StandingsSection({ state, gameState, playerId, settings, standings, standingsMode }: SectionProps) {
  if (standingsMode === 'popover') return null;
  const isSheet = standingsMode === 'sheet';
  if (isSheet && !state.leaderboardOpen) return null;
  return (
    <InGameLeaderboard
      players={standings.players}
      localPlayerId={playerId}
      currentRound={gameState.currentRound}
      currentPlayerIndex={standings.currentPlayerIndex}
      isOpen={isSheet ? state.leaderboardOpen : true}
      onClose={() => state.setLeaderboardOpen(false)}
      mode={standingsMode}
      position={settings.leaderboardPosition}
      compact={settings.leaderboardCompact}
    />
  );
}

function TopBarSection({ state, gameState, playerId, settings, standings, standingsMode }: SectionProps) {
  const isPopover = standingsMode === 'popover';
  return (
    <HudSlot region="actions" order={HUD_SLOT_ORDER.actions.topBar}>
      <TopBarButtons
        onStatsOpen={() => state.setStatsOpen(true)}
        onSettingsOpen={() => state.setSettingsOpen(true)}
        onLeaderboardToggle={() => state.setLeaderboardOpen((prev) => !prev)}
        leaderboardOpen={state.leaderboardOpen}
        showLeaderboard={isPopover}
        leaderboardContent={isPopover ? (
          <InGameLeaderboard
            players={standings.players}
            localPlayerId={playerId}
            currentRound={gameState.currentRound}
            currentPlayerIndex={standings.currentPlayerIndex}
            isOpen={state.leaderboardOpen}
            onClose={() => state.setLeaderboardOpen(false)}
            mode="popover"
            compact={settings.leaderboardCompact}
          />
        ) : null}
      />
    </HudSlot>
  );
}

/** Reconnecting and new-version notices and whose turn it is, in the prompt region. */
function PromptSection({ state, gameState, playerId, policy, standings }: SectionProps) {
  const showTurn = gameState.phase === GamePhase.PLAYING || state.trickResult !== null;
  const currentPlayer = standings.players[standings.currentPlayerIndex];
  return (
    <>
      {state.isConnected ? null : (
        <HudSlot region="prompt" order={HUD_SLOT_ORDER.prompt.reconnecting} interactive={false}>
          <ReconnectingNotice />
        </HudSlot>
      )}
      <NewVersionHudNotice />
      {showTurn ? (
        <HudSlot region="prompt" order={HUD_SLOT_ORDER.prompt.turnIndicator} interactive={false}>
          <TurnIndicator
            trickResult={state.trickResult}
            currentPlayerName={currentPlayer?.name ?? ''}
            isMyTurn={currentPlayer?.id === playerId}
            localPlayerId={playerId}
            isMobile={policy.compactHud}
          />
        </HudSlot>
      ) : null}
    </>
  );
}

function BiddingSection({ state, gameState, playerId, policy }: SectionProps) {
  const { localPlayer } = state;
  if (gameState.phase !== GamePhase.BIDDING || !localPlayer) return null;
  return (
    <BiddingUI
      players={gameState.players}
      localPlayerId={playerId}
      currentPlayerIndex={gameState.currentPlayerIndex}
      maxBid={localPlayer.hand.length}
      trumpSuit={gameState.trumpSuit}
      forbiddenBid={gameState.forbiddenBid}
      onPlaceBid={state.handlePlaceBid}
      surface={policy.biddingSurface}
      density={policy.density}
      hand={localPlayer.hand}
    />
  );
}

/** Emotes, chat, reactions and hand controls: corner regions, or one controls button on phones. */
function SocialAndControlsSection({ state, policy, showRoundEndUI, interactionsDisabled }: SectionProps) {
  const isHandAnimating = state.handAnimation !== 'none';
  return (
    <>
      {policy.compactHud ? null : (
        <HudSlot region="social" order={HUD_SLOT_ORDER.social.emotesAndChat}>
          <div className="flex items-center gap-2">
            <EmoteBar onSendEmote={state.sendEmote} disabled={interactionsDisabled} />
            <QuickChat onSendMessage={state.sendChat} disabled={interactionsDisabled} />
          </div>
        </HudSlot>
      )}
      <HudSlot region="controls" order={HUD_SLOT_ORDER.controls.reactions}>
        <div className="flex flex-col items-end gap-2">
          <ReactionsFeed emotes={state.displayEmotes} chatMessages={state.displayChatMessages} />
          {policy.compactHud ? null : <HandControls onShuffle={state.handleShuffle} onSort={state.handleSort} isAnimating={isHandAnimating} />}
        </div>
      </HudSlot>
      {policy.compactHud && !showRoundEndUI ? (
        <MobileGameControls
          onShuffle={state.handleShuffle}
          onSort={state.handleSort}
          isHandAnimating={isHandAnimating}
          onSendEmote={state.sendEmote}
          onSendChat={state.sendChat}
          onStandingsOpen={() => state.setLeaderboardOpen(true)}
          disabled={interactionsDisabled}
        />
      ) : null}
    </>
  );
}

/**
 * The in-game HUD laid out in named, non-overlapping regions (HudLayout). Every placement and
 * size decision comes from the layout policy; no component positions itself on the screen.
 */
export function GameHud(props: GameHudProps) {
  const { state, gameState, playerId, policy, settings } = props;
  const sectionProps: SectionProps = { ...props, standingsMode: resolveStandingsMode(policy, settings.leaderboardPosition) };

  return (
    <HudLayout policy={policy}>
      <HudSlot region="status" order={HUD_SLOT_ORDER.status.statusBar}>
        <GameStatusBar
          currentRound={gameState.currentRound}
          maxRounds={gameState.maxRounds}
          trumpSuit={gameState.trumpSuit}
          isConnected={state.isConnected}
          compact={policy.density === 'compact'}
        >
          {/* Tournament matches show their badge under the round/trump bar */}
          {state.tournamentMatch ? <TournamentMatchBadge match={state.tournamentMatch} /> : null}
        </GameStatusBar>
      </HudSlot>
      <TopBarSection {...sectionProps} />
      <PromptSection {...sectionProps} />
      <TurnTimerSection
        gameState={gameState}
        playerId={playerId}
        placement={policy.turnTimer}
        sharedCustomSounds={state.sharedCustomSounds}
        onPlayTimeoutSound={state.playTimeoutSound}
      />
      <StandingsSection {...sectionProps} />
      <BiddingSection {...sectionProps} />
      <SocialAndControlsSection {...sectionProps} />
    </HudLayout>
  );
}
