'use client';

import { ChevronLeft } from 'lucide-react';
import { ScrollIndicator } from '../ui';
import { HudPanelDecor } from './skins';
import { QUICK_MESSAGES } from '../social';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface ControlsChatViewProps {
  onBack: () => void;
  onSendChat: (message: string) => void;
}

/**
 * Quick chat selection view
 */
export function ControlsChatView({ onBack, onSendChat }: ControlsChatViewProps) {
  return (
    <div className="relative isolate px-4 pt-2 pb-6">
      <HudPanelDecor variant="chat" contained />
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-amber-400 text-xs mb-3 cursor-pointer hover:text-amber-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="font-serif">Back</span>
      </button>
      <ScrollIndicator maxHeight="40vh">
        <div className="grid grid-cols-2 gap-2 py-3">
          {QUICK_MESSAGES.map((message) => (
            <button
              key={message}
              onClick={() => onSendChat(message)}
              className="group relative px-3 py-3 text-sm text-amber-200/90 transition-all cursor-pointer active:scale-95 text-center"
              style={{
                background: THEME_SURFACE.CONTROL_BG,
                fontFamily: 'var(--font-serif)',
              }}
            >
              {/* Border frame */}
              <div className="absolute inset-0 border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
              <span className="relative">{message}</span>
            </button>
          ))}
        </div>
      </ScrollIndicator>
    </div>
  );
}
