import type React from 'react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'amber' | 'emerald';
}

export function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  const colors = {
    amber: {
      border: 'border-amber-700/30',
      icon: 'text-amber-500',
      label: 'text-amber-500/60',
      value: 'text-amber-200',
      subtext: 'text-amber-600/50',
    },
    emerald: {
      border: 'border-emerald-700/30',
      icon: 'text-emerald-500',
      label: 'text-emerald-500/60',
      value: 'text-emerald-200',
      subtext: 'text-emerald-600/50',
    },
  };

  const c = colors[color];

  return (
    <div
      className={`rounded-xl p-4 border ${c.border}`}
      style={{ background: THEME_SURFACE.CARD_BG }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={c.icon}>{icon}</span>
        <span className={`text-[10px] uppercase tracking-wider ${c.label}`} style={{ fontFamily: 'Georgia, serif' }}>
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold ${c.value}`}>{value}</div>
      <div className={`text-[10px] mt-1 ${c.subtext}`} style={{ fontFamily: 'Georgia, serif' }}>
        {subtext}
      </div>
    </div>
  );
}
