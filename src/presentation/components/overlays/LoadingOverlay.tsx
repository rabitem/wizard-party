'use client';

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 bg-[#030308] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-amber-500/30 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-amber-400 rounded-full animate-spin" />
        </div>
        <span className="text-amber-200/60 text-sm tracking-widest uppercase">Loading</span>
      </div>
    </div>
  );
}
