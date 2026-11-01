'use client';

import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/** Animated crystal icon with rotating rings and sparkles */
function MysticalIcon() {
  return (
    <div className="relative mx-auto mb-6 w-20 h-20">
      <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: 'var(--accent)', borderBottomColor: 'var(--text-muted)', animationDuration: '3s' }} />
      <div className="absolute inset-2 rounded-full" style={{ border: '1px solid var(--surface-border)', background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 70%)' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <i className="ra ra-crystal-ball text-3xl animate-pulse" style={{ color: 'var(--accent)' }} />
      </div>
      <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full animate-ping" style={{ background: 'var(--accent-pale)', animationDuration: '2s' }} />
      <div className="absolute bottom-2 left-1 w-1 h-1 rounded-full animate-ping" style={{ background: 'var(--accent)', animationDuration: '2.5s', animationDelay: '0.5s' }} />
    </div>
  );
}

/** Title and description section */
function RecoveryMessage() {
  return (
    <>
      <h2 className="text-xl mb-2" style={{ fontFamily: 'Georgia, serif', color: 'var(--accent-pale)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        Restoring the Realm
      </h2>
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--text-muted))' }} />
        <i className="ra ra-fairy-wand text-xs" style={{ color: 'var(--accent-dim)' }} />
        <div className="w-12 h-px" style={{ background: 'linear-gradient(90deg, var(--text-muted), transparent)' }} />
      </div>
      <p className="text-sm mb-6 leading-relaxed" style={{ fontFamily: 'Georgia, serif', color: 'var(--accent-parchment)' }}>
        The magical energies have been disrupted.<br />
        <span style={{ color: 'var(--text-muted)' }}>Weaving the spell anew...</span>
      </p>
    </>
  );
}

/** Animated loading dots */
function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: `${i * 0.15}s`, animationDuration: '1s' }} />
      ))}
    </div>
  );
}

/** Manual recovery button */
function RecoverButton({ onForceRecover }: { onForceRecover: () => void }) {
  return (
    <button onClick={onForceRecover} className="group relative px-6 py-2.5 transition-all cursor-pointer" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface-border) 60%, transparent) 0%, color-mix(in srgb, var(--surface) 80%, transparent) 100%)', border: '1px solid color-mix(in srgb, var(--accent-dim), black 15%)', borderRadius: '4px' }}>
      <div className="absolute inset-0 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent) 0%, transparent 70%)' }} />
      <span className="relative text-sm group-hover:text-amber-300 transition-colors" style={{ fontFamily: 'Georgia, serif', color: 'var(--text-muted)' }}>
        <i className="ra ra-hand text-xs mr-2" />Cast spell manually
      </span>
    </button>
  );
}

/** Corner ornament decorations */
function CornerOrnaments() {
  return (
    <>
      <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2" style={{ borderColor: 'var(--accent)' }} />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: 'var(--text-muted)' }} />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2" style={{ borderColor: 'var(--text-muted)' }} />
    </>
  );
}

interface WebGLRecoveryOverlayProps {
  onForceRecover: () => void;
}

export function WebGLRecoveryOverlay({ onForceRecover }: WebGLRecoveryOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--surface) 98%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 99%, transparent) 100%)' }}>
      <div className="relative">
        <div className="absolute -inset-4 rounded-lg blur-xl opacity-40" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
        <div className="relative rounded-lg overflow-hidden max-w-md w-full" style={{ background: THEME_SURFACE.PANEL_BG, border: '2px solid var(--surface-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 color-mix(in srgb, var(--accent) 10%, transparent)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent 0%, var(--accent) 20%, var(--accent-pale) 50%, var(--accent) 80%, transparent 100%)' }} />
          <div className="px-8 py-10 text-center">
            <MysticalIcon />
            <RecoveryMessage />
            <LoadingDots />
            <RecoverButton onForceRecover={onForceRecover} />
          </div>
          <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent 0%, var(--text-muted) 30%, var(--accent) 50%, var(--text-muted) 70%, transparent 100%)' }} />
          <CornerOrnaments />
        </div>
      </div>
    </div>
  );
}
