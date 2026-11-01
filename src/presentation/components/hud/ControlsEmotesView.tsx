'use client';

import { ChevronLeft } from 'lucide-react';
import { ScrollIndicator } from '../ui';
import { HudPanelDecor } from './skins';
import { EMOTES, StyledEmoji } from '../social';

interface ControlsEmotesViewProps {
  onBack: () => void;
  onSendEmote: (emoteId: string) => void;
}

/**
 * Emotes selection view
 */
export function ControlsEmotesView({ onBack, onSendEmote }: ControlsEmotesViewProps) {
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
  );
}
