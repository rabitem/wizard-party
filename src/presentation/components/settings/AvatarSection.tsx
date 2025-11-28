'use client';

import { Palette } from 'lucide-react';
import { StyledEmoji } from '../StyledEmoji';
import { AVATAR_PRESETS } from './settings-presets';

interface AvatarSectionProps {
  selectedAvatar: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarSection({ selectedAvatar, onSelect }: AvatarSectionProps) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">
        <Palette className="w-4 h-4" />
        Avatar
      </h3>
      <div className="grid grid-cols-6 gap-3">
        {AVATAR_PRESETS.map((avatar) => (
          <StyledEmoji
            key={avatar.id}
            emoji={avatar.emoji}
            size="lg"
            selected={selectedAvatar === avatar.id}
            onClick={() => onSelect(avatar.id)}
          />
        ))}
      </div>
    </section>
  );
}
