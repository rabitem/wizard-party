interface PlacementBadgeProps {
  placement: number;
}

export function PlacementBadge({ placement }: PlacementBadgeProps) {
  const styles = {
    1: 'bg-gradient-to-br from-amber-500 to-amber-700 text-amber-950 border-amber-400/50',
    2: 'bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 border-slate-200/50',
    3: 'bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200 border-amber-600/50',
  };

  const style = styles[placement as keyof typeof styles] || 'bg-[#15120e] text-amber-500/50 border-amber-800/30';

  return (
    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${style}`}>
      {placement}
    </div>
  );
}
