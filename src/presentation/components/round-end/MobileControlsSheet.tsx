'use client';

import { Sparkles, MessageCircle } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { BottomSheet, ScrollIndicator } from '../ui';
import { EMOTES, QUICK_MESSAGES, StyledEmoji } from '../social';

interface MobileControlsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  controlsView: 'main' | 'emotes' | 'chat';
  setControlsView: (view: 'main' | 'emotes' | 'chat') => void;
  onSendEmote: (emoteId: string) => void;
  onSendChat: (message: string) => void;
}

function getSheetTitle(controlsView: 'main' | 'emotes' | 'chat'): string {
  if (controlsView === 'emotes') return 'Send Sigil';
  if (controlsView === 'chat') return 'Quick Chat';
  return 'Actions';
}

export function MobileControlsSheet({
  isOpen,
  onClose,
  controlsView,
  setControlsView,
  onSendEmote,
  onSendChat,
}: MobileControlsSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={getSheetTitle(controlsView)}
      maxHeight={controlsView === 'main' ? 35 : 60}
    >
      {controlsView === 'main' && (
        <div className="px-4 pt-2 pb-6">
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              onClick={() => setControlsView('emotes')}
              className="group relative flex flex-col items-center gap-2 p-4 transition-all cursor-pointer active:scale-95"
              style={{
                background: THEME_SURFACE.MODAL_BG,
              }}
            >
              <div className="absolute inset-0 border-2 border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
              <div className="absolute inset-[2px] bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
              <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
              <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
              <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
              <Sparkles className="w-6 h-6 text-amber-400 relative" />
              <span className="text-xs text-amber-200 relative" style={{ fontFamily: 'Georgia, serif' }}>Sigils</span>
            </button>
            <button
              onClick={() => setControlsView('chat')}
              className="group relative flex flex-col items-center gap-2 p-4 transition-all cursor-pointer active:scale-95"
              style={{
                background: THEME_SURFACE.MODAL_BG,
              }}
            >
              <div className="absolute inset-0 border-2 border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
              <div className="absolute inset-[2px] bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
              <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
              <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
              <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
              <MessageCircle className="w-6 h-6 text-amber-400 relative" />
              <span className="text-xs text-amber-200 relative" style={{ fontFamily: 'Georgia, serif' }}>Chat</span>
            </button>
          </div>
        </div>
      )}
      {controlsView === 'emotes' && (
        <div className="px-4 pt-2 pb-6">
          <ScrollIndicator maxHeight="40vh">
            <div className="grid grid-cols-5 gap-3 py-3">
              {EMOTES.map((emote) => (
                <StyledEmoji
                  key={emote.id}
                  icon={emote.icon}
                  size="lg"
                  onClick={() => onSendEmote(emote.id)}
                />
              ))}
            </div>
          </ScrollIndicator>
        </div>
      )}
      {controlsView === 'chat' && (
        <div className="px-4 pt-2 pb-6">
          <ScrollIndicator maxHeight="40vh">
            <div className="grid grid-cols-2 gap-2 py-3">
              {QUICK_MESSAGES.map((message) => (
                <button
                  key={message}
                  onClick={() => onSendChat(message)}
                  className="group relative px-3 py-3 text-sm text-amber-200/90 transition-all cursor-pointer active:scale-95 text-center"
                  style={{
                    background: THEME_SURFACE.MODAL_BG,
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  <div className="absolute inset-0 border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
                  <span className="relative">{message}</span>
                </button>
              ))}
            </div>
          </ScrollIndicator>
        </div>
      )}
    </BottomSheet>
  );
}
