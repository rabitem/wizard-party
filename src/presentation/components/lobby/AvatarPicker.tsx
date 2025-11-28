'use client';

import { AVATAR_PRESETS } from '../SettingsPanel';
import { StyledEmoji } from '../EmoteBar';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selectedAvatar, onSelect }: AvatarPickerProps) {
  return (
    <div className="absolute right-0 top-full mt-2 bg-[#0a0a15] border border-amber-500/30 rounded-xl p-3 shadow-xl z-50">
      <p className="text-xs text-amber-400/60 px-1 pb-2">Choose your avatar</p>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_PRESETS.map((avatar) => (
          <StyledEmoji
            key={avatar.id}
            emoji={avatar.emoji}
            size="md"
            selected={selectedAvatar === avatar.id}
            onClick={() => onSelect(avatar.id)}
          />
        ))}
      </div>
    </div>
  );
}
