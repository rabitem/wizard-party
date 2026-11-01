'use client';

import { Shield } from 'lucide-react';
import { StyledEmoji } from '../StyledEmoji';
import { AVATAR_PRESETS } from './settings-presets';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface AvatarSectionProps {
  selectedAvatar: string;
  onSelect: (avatarId: string) => void;
}

export function AvatarSection({ selectedAvatar, onSelect }: AvatarSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Shield className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Sigil
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div
        className="p-3 rounded border border-amber-800/30"
        style={{
          background: THEME_SURFACE.CARD_BG,
        }}
      >
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_PRESETS.map((avatar) => (
            <StyledEmoji
              key={avatar.id}
              icon={avatar.icon}
              size="lg"
              selected={selectedAvatar === avatar.id}
              onClick={() => onSelect(avatar.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
