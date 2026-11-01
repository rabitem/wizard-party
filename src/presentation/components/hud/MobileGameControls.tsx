'use client';

import { useState, useCallback, useEffect } from 'react';
import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import { useSheet, useSheetState, BottomSheet, useClickLock } from '../ui';
import { COOLDOWN_SECONDS } from '../social/types';
import { HudSlot } from './layout';
import { ControlsFAB } from './ControlsFAB';
import { ControlsMainView } from './ControlsMainView';
import { ControlsEmotesView } from './ControlsEmotesView';
import { ControlsChatView } from './ControlsChatView';

interface MobileGameControlsProps {
  onShuffle: () => void;
  onSort: () => void;
  isHandAnimating?: boolean;
  onSendEmote: (emoteId: string) => void;
  onSendChat: (message: string) => void;
  onStandingsOpen?: () => void;
  disabled?: boolean;
}

type ControlsView = 'main' | 'emotes' | 'chat';

export function MobileGameControls({
  onShuffle,
  onSort,
  isHandAnimating = false,
  onSendEmote,
  onSendChat,
  onStandingsOpen,
  disabled,
}: MobileGameControlsProps) {
  const { isOpen, toggle, close } = useSheetState('quickchat');
  // An open sheet (this one, bidding, standings) covers the controls corner: no button under it.
  const anySheetOpen = useSheet().activeSheet !== null;
  const [view, setView] = useState<ControlsView>('main');
  const [emoteCooldown, setEmoteCooldown] = useState(0);
  const [chatCooldown, setChatCooldown] = useState(0);
  const tryClick = useClickLock(300);

  const closeAndResetView = useCallback(() => {
    setView('main');
    close();
  }, [close]);

  // Cooldown timers
  useEffect(() => {
    if (emoteCooldown <= 0) return;
    const timer = setInterval(() => setEmoteCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [emoteCooldown]);

  useEffect(() => {
    if (chatCooldown <= 0) return;
    const timer = setInterval(() => setChatCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [chatCooldown]);

  const handleSendEmote = useCallback((emoteId: string) => {
    tryClick(() => {
      if (emoteCooldown > 0) return;
      onSendEmote(emoteId);
      setEmoteCooldown(COOLDOWN_SECONDS);
      closeAndResetView();
    });
  }, [emoteCooldown, onSendEmote, tryClick, closeAndResetView]);

  const handleSendChat = useCallback((message: string) => {
    tryClick(() => {
      if (chatCooldown > 0) return;
      onSendChat(message);
      setChatCooldown(COOLDOWN_SECONDS);
      closeAndResetView();
    });
  }, [chatCooldown, onSendChat, tryClick, closeAndResetView]);

  const handleShuffle = useCallback(() => {
    tryClick(() => { onShuffle(); closeAndResetView(); });
  }, [onShuffle, tryClick, closeAndResetView]);

  const handleSort = useCallback(() => {
    tryClick(() => { onSort(); closeAndResetView(); });
  }, [onSort, tryClick, closeAndResetView]);

  const handleStandings = useCallback(() => {
    tryClick(() => { closeAndResetView(); onStandingsOpen?.(); });
  }, [onStandingsOpen, tryClick, closeAndResetView]);

  const getTitle = () => {
    if (view === 'emotes') return 'Send Sigil';
    if (view === 'chat') return 'Quick Chat';
    return 'Game Controls';
  };

  return (
    <>
      {anySheetOpen ? null : (
        <HudSlot region="controls" order={HUD_SLOT_ORDER.controls.controlsButton}>
          <ControlsFAB disabled={disabled} onToggle={toggle} />
        </HudSlot>
      )}
      <BottomSheet isOpen={isOpen} onClose={closeAndResetView} title={getTitle()} maxHeight={view === 'main' ? 45 : 70}>
        {view === 'main' && (
          <ControlsMainView
            emoteCooldown={emoteCooldown}
            chatCooldown={chatCooldown}
            onShuffle={handleShuffle}
            onSort={handleSort}
            isHandAnimating={isHandAnimating}
            onStandingsOpen={onStandingsOpen ? handleStandings : undefined}
            onEmotesOpen={() => setView('emotes')}
            onChatOpen={() => setView('chat')}
          />
        )}
        {view === 'emotes' && <ControlsEmotesView onBack={() => setView('main')} onSendEmote={handleSendEmote} />}
        {view === 'chat' && <ControlsChatView onBack={() => setView('main')} onSendChat={handleSendChat} />}
      </BottomSheet>
    </>
  );
}
