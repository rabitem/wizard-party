'use client';

import { MoreHorizontal } from 'lucide-react';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { ConnectionIndicator } from '../connection-indicator';

interface MobileControlsBarProps {
  isConnected: boolean;
  onOpenControls: () => void;
}

export function MobileControlsBar({ isConnected, onOpenControls }: MobileControlsBarProps) {
  return (
    <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
      <ConnectionIndicator isWebSocketConnected={isConnected} compact />
      <button
        onClick={onOpenControls}
        className="group relative flex items-center justify-center w-8 h-8 cursor-pointer active:scale-95 transition-all"
        style={{
          background: THEME_SURFACE.MODAL_BG,
        }}
      >
        {/* Border frame */}
        <div className="absolute inset-0 border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
        <MoreHorizontal className="w-4 h-4 text-amber-400 relative" />
      </button>
    </div>
  );
}
