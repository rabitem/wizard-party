'use client';

import { AVATAR_PRESETS } from '../settings';
import { StyledEmoji } from '../social';
import { LobbyPanelBackdrop, LobbyPanelDecor } from './skins';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selectedAvatar, onSelect }: AvatarPickerProps) {
  return (
    <div
      className="relative isolate rounded-xl border border-[var(--surface-border)] p-4 shadow-xl"
      style={{
        background: 'var(--surface)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        minWidth: '200px',
        maxWidth: '280px',
      }}
    >
      <LobbyPanelBackdrop variant="avatar" />
      <p
        className="text-sm text-amber-400/80 mb-3 text-center"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Choose your avatar
      </p>
      <div className="grid grid-cols-4 gap-2">
        {AVATAR_PRESETS.map((avatar) => (
          <StyledEmoji
            key={avatar.id}
            icon={avatar.icon}
            size="md"
            selected={selectedAvatar === avatar.id}
            onClick={() => onSelect(avatar.id)}
          />
        ))}
      </div>
      <LobbyPanelDecor variant="avatar" />
    </div>
  );
}
