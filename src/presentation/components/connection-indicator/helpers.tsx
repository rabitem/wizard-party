'use client';

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface TooltipPosition {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'right';
}

/** Get quality color */
function getQualityColor(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent': return '#22c55e';
    case 'good': return '#84cc16';
    case 'fair': return '#eab308';
    case 'poor': return '#f97316';
    case 'offline': return '#ef4444';
    default: return '#6b7280';
  }
}

interface ServiceRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ok: boolean;
  extra?: string;
}

export function ServiceRow({ icon: Icon, label, ok, extra }: ServiceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${ok ? 'text-emerald-400' : 'text-red-400'}`} />
        <span className="text-amber-200/80 text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {extra ? <span className="text-amber-500/50 text-[10px]">{extra}</span> : null}
        <div
          className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ boxShadow: ok ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px color-mix(in srgb, var(--color-amber-600) 50%, transparent)' }}
        />
      </div>
    </div>
  );
}

interface QualityBarsProps {
  quality: ConnectionQuality;
}

export function QualityBars({ quality }: QualityBarsProps) {
  const qualityToBars: Record<ConnectionQuality, number> = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1,
    offline: 0,
  };
  const bars = qualityToBars[quality];

  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className="w-1 rounded-sm transition-all duration-300"
          style={{
            height: `${bar * 25}%`,
            backgroundColor: bar <= bars ? getQualityColor(quality) : 'rgba(255,255,255,0.1)',
            opacity: bar <= bars ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}
