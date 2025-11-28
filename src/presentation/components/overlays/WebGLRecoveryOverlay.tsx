'use client';

interface WebGLRecoveryOverlayProps {
  onForceRecover: () => void;
}

export function WebGLRecoveryOverlay({ onForceRecover }: WebGLRecoveryOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 bg-[#030308]/95 flex items-center justify-center p-4">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 rounded-2xl blur-sm" />
        <div className="relative bg-[#0a0a15] border border-amber-500/20 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-amber-400 rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-light text-amber-100 mb-3">Recovering Graphics</h2>
          <p className="text-amber-200/60 mb-6 text-sm">
            The 3D renderer was interrupted. Reconnecting automatically...
          </p>
          <button
            onClick={onForceRecover}
            className="text-amber-400/60 hover:text-amber-300 text-sm transition-colors cursor-pointer underline underline-offset-4"
          >
            Click here if not recovering
          </button>
        </div>
      </div>
    </div>
  );
}
