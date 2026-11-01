'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { useSheetState, useSheet } from './ui';
import { SeasonalCorner, SeasonalDivider } from './seasonal';
import {
  BannerDecoration,
  MobileControlsSheet,
  MobileControlsBar,
  PlayerRankingCard,
  RoundStats,
  NextRoundButton,
  type RoundEndUIProps,
} from './round-end';
import {
  ROUND_END_FOOTER_CLASS,
  ROUND_END_FRAME_CLASS,
  ROUND_END_PANEL_CLASS,
  ROUND_END_SCROLL_CLASS,
} from './round-end/round-end-layout';

const CORNER_SIZE = 32;

/** Desktop-only seasonal corner ornaments (theme emblem per UI theme) */
function CornerFlourishes() {
  return (
    <>
      <SeasonalCorner position="top-left" size={CORNER_SIZE} />
      <SeasonalCorner position="top-right" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-left" size={CORNER_SIZE} />
      <SeasonalCorner position="bottom-right" size={CORNER_SIZE} />
    </>
  );
}

/** Desktop-only divider ornament between standings and stats */
function DividerOrnament() {
  return (
    <div className="flex justify-center py-2">
      <SeasonalDivider size={14} className="w-40" />
    </div>
  );
}

/** Desktop-only bottom flourish */
function BottomFlourish() {
  return (
    <div className="flex justify-center pb-3">
      <SeasonalDivider size={14} className="w-20" />
    </div>
  );
}

/** Round header banner with title */
function RoundHeader({ currentRound, maxRounds, isMobile }: { currentRound: number; maxRounds: number; isMobile: boolean }) {
  return (
    <div className={`relative ${isMobile ? 'pt-1 pb-2' : 'pt-6 pb-4'} text-center`}>
      {!isMobile && <BannerDecoration />}
      <div className="relative inline-block">
        <div
          className={`${isMobile ? 'px-4 py-1' : 'px-8 py-2'} border border-amber-700/30 rounded`}
          style={{ background: THEME_SURFACE.TILE_BG }}
        >
          <div className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-amber-600/60 uppercase tracking-[0.3em] mb-0.5`}>
            Round {currentRound} of {maxRounds}
          </div>
          <div className={`${isMobile ? 'text-base' : 'text-xl'} text-amber-200/90 tracking-wide`} style={{ fontFamily: 'Georgia, serif' }}>
            Battle Complete
          </div>
        </div>
      </div>
    </div>
  );
}

/** Player rankings list */
function PlayerRankings({
  sortedPlayers,
  localPlayerId,
  isMobile,
}: {
  sortedPlayers: RoundEndUIProps['players'];
  localPlayerId: string;
  isMobile: boolean;
}) {
  return (
    <div className={`${isMobile ? 'px-2 pb-2' : 'px-6 pb-4'}`}>
      <div className={`${isMobile ? 'space-y-1' : 'space-y-2'}`}>
        {sortedPlayers.map((player, index) => (
          <PlayerRankingCard key={player.id} player={player} index={index} localPlayerId={localPlayerId} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}

/** Manages mobile controls state and handlers */
function useMobileControls(onSendEmote?: (id: string) => void, onSendChat?: (msg: string) => void) {
  const [controlsView, setControlsView] = useState<'main' | 'emotes' | 'chat'>('main');
  const { isOpen, open, close } = useSheetState('roundend-controls');

  const handleSendEmote = (emoteId: string) => {
    onSendEmote?.(emoteId);
    close();
    setControlsView('main');
  };

  const handleSendChat = (message: string) => {
    onSendChat?.(message);
    close();
    setControlsView('main');
  };

  const handleClose = () => {
    close();
    setControlsView('main');
  };

  const handleOpen = () => {
    open();
    setControlsView('main');
  };

  return { isOpen, controlsView, setControlsView, handleSendEmote, handleSendChat, handleClose, handleOpen };
}

export function RoundEndUI({
  players,
  currentRound,
  maxRounds,
  localPlayerId,
  hostId,
  onNextRound,
  isConnected = true,
  onSendEmote,
  onSendChat,
  isMobile = false,
}: RoundEndUIProps) {
  const isHost = localPlayerId === hostId;
  const { closeSheet } = useSheet();
  const hasInitialized = useRef(false);
  const { isOpen, controlsView, setControlsView, handleSendEmote, handleSendChat, handleClose, handleOpen } = useMobileControls(onSendEmote, onSendChat);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    closeSheet();
  }, [closeSheet]);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => b.score - a.score), [players]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-40 p-4">
      <div className={ROUND_END_FRAME_CLASS}>
        {isMobile ? <MobileControlsSheet isOpen={isOpen} onClose={handleClose} controlsView={controlsView} setControlsView={setControlsView} onSendEmote={handleSendEmote} onSendChat={handleSendChat} /> : null}
        <div className="absolute -inset-3 rounded-lg blur-xl" style={{ background: THEME_SURFACE.HALO }} />
        <div
          className={ROUND_END_PANEL_CLASS}
          style={{ background: THEME_SURFACE.PANEL_BG, boxShadow: THEME_SURFACE.LOADING_SHADOW }}
        >
          {!isMobile && <CornerFlourishes />}
          {/* Standings scroll; the footer keeps the next-round button in view on short screens */}
          <div className={ROUND_END_SCROLL_CLASS}>
            {isMobile ? <MobileControlsBar isConnected={isConnected} onOpenControls={handleOpen} /> : null}
            <RoundHeader currentRound={currentRound} maxRounds={maxRounds} isMobile={isMobile} />
            <PlayerRankings sortedPlayers={sortedPlayers} localPlayerId={localPlayerId} isMobile={isMobile} />
            {!isMobile && <DividerOrnament />}
            <RoundStats currentRound={currentRound} maxRounds={maxRounds} players={players} isMobile={isMobile} />
          </div>
          <div className={ROUND_END_FOOTER_CLASS}>
            <div className={`${isMobile ? 'px-2 py-2' : 'px-6 pt-2 pb-6'}`}>
              <NextRoundButton isHost={isHost} currentRound={currentRound} onNextRound={onNextRound} isMobile={isMobile} />
            </div>
            {!isMobile && <BottomFlourish />}
          </div>
        </div>
      </div>
    </div>
  );
}
