import type React from 'react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface MiniStatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

export function MiniStatCard({ icon, value, label }: MiniStatCardProps) {
  return (
    <div
      className="rounded-lg p-3 border border-amber-800/30 text-center"
      style={{ background: THEME_SURFACE.CARD_BG }}
    >
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-semibold text-amber-200">{value}</div>
      <div className="text-[9px] text-amber-600/50 uppercase" style={{ fontFamily: 'Georgia, serif' }}>
        {label}
      </div>
    </div>
  );
}
