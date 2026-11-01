'use client';

import { Bell } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface NotificationsSectionProps {
  enabled: boolean;
  onToggle: () => void;
}

function MedievalToggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-12 h-6 rounded transition-all cursor-pointer border border-amber-800/40"
      style={{
        background: enabled
          ? THEME_SURFACE.ACTIVE_BG
          : THEME_SURFACE.INACTIVE_BG,
      }}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0.5'
        }`}
        style={{
          background: enabled
            ? 'linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%)'
            : 'linear-gradient(180deg, var(--accent-dim) 0%, color-mix(in srgb, var(--accent-dim), black 30%) 100%)',
          boxShadow: enabled ? '0 0 8px color-mix(in srgb, var(--accent) 40%, transparent)' : 'none',
        }}
      />
    </button>
  );
}

export function NotificationsSection({ enabled, onToggle }: NotificationsSectionProps) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
        <Bell className="w-4 h-4 text-amber-500/60" />
        <span
          className="text-xs text-amber-400/70 uppercase tracking-widest font-serif"
        >
          Heralds
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
      </div>
      <div
        className="flex items-center justify-between p-3 rounded border border-amber-800/30"
        style={{
          background: THEME_SURFACE.CARD_BG,
        }}
      >
        <div>
          <span className="text-amber-200/80 block font-serif">
            Turn Summons
          </span>
          <span className="text-xs text-amber-500/50 font-serif">
            Be summoned when thy turn arrives
          </span>
        </div>
        <MedievalToggle enabled={enabled} onClick={onToggle} />
      </div>
    </section>
  );
}
