export function NewBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-orange-500/25 text-orange-200 rounded border border-orange-400/40 ${className}`}
    >
      New
    </span>
  );
}
