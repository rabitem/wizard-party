import { RotateCcw } from 'lucide-react';

/** Reset confirmation dialog */
export function ResetConfirmation({
  showConfirm,
  onCancel,
  onConfirm,
  onShowConfirm,
}: {
  showConfirm: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onShowConfirm: () => void;
}) {
  if (showConfirm) {
    return (
      <div
        className="flex items-center justify-between rounded-lg border border-red-900/40 p-3"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 20%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 10%, transparent) 100%)' }}
      >
        <span className="text-sm text-red-400/80 font-serif">
          Erase all records?
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-amber-500/70 hover:text-amber-400 transition-colors cursor-pointer font-serif"
          >
            Nay
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer font-serif"
          >
            Aye
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onShowConfirm}
      className="flex items-center gap-2 text-xs text-amber-700/50 hover:text-amber-500 transition-colors cursor-pointer font-serif"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      Reset thy chronicles
    </button>
  );
}
