import type React from 'react';

interface StatRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}

export function StatRow({ icon, label, value, highlight = false }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-amber-600/40">{icon}</span>
        <span className="text-sm text-amber-400/60 font-serif">
          {label}
        </span>
      </div>
      <span className={`text-sm font-medium ${highlight ? 'text-emerald-400' : 'text-amber-200'}`}>{value}</span>
    </div>
  );
}
