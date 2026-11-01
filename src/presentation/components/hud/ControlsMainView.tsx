'use client';

import { Sparkles, MessageCircle, Shuffle, ArrowUpDown, Trophy } from 'lucide-react';
import { MedievalControlButton } from './MedievalControlButton';

interface ControlsMainViewProps {
  emoteCooldown: number;
  chatCooldown: number;
  onShuffle: () => void;
  onSort: () => void;
  /** A shuffle or sort is running; a second request would be dropped, so the buttons wait. */
  isHandAnimating?: boolean;
  onStandingsOpen?: () => void;
  onEmotesOpen: () => void;
  onChatOpen: () => void;
}

/**
 * Main view showing control buttons grid
 */
export function ControlsMainView({
  emoteCooldown,
  chatCooldown,
  onShuffle,
  onSort,
  isHandAnimating = false,
  onStandingsOpen,
  onEmotesOpen,
  onChatOpen,
}: ControlsMainViewProps) {
  return (
    <div className="px-4 pt-2 pb-6">
      <div className="grid grid-cols-3 gap-2 py-2">
        <MedievalControlButton onClick={onShuffle} disabled={isHandAnimating} icon={Shuffle} iconId="shuffle" label="Shuffle" />
        <MedievalControlButton onClick={onSort} disabled={isHandAnimating} icon={ArrowUpDown} iconId="sort" label="Sort" />
        {onStandingsOpen ? (
          <MedievalControlButton onClick={onStandingsOpen} icon={Trophy} iconId="trophy" label="Standings" />
        ) : null}
        <MedievalControlButton
          onClick={onEmotesOpen}
          disabled={emoteCooldown > 0}
          icon={Sparkles}
          iconId="emotes"
          label={emoteCooldown > 0 ? `${emoteCooldown}s` : 'Sigils'}
        />
        <MedievalControlButton
          onClick={onChatOpen}
          disabled={chatCooldown > 0}
          icon={MessageCircle}
          iconId="chat"
          label={chatCooldown > 0 ? `${chatCooldown}s` : 'Chat'}
        />
      </div>
    </div>
  );
}
