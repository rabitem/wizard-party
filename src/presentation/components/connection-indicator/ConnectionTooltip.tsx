'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Radio } from 'lucide-react';
import { ServiceRow, type TooltipPosition } from './helpers';

type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

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

interface ConnectionTooltipProps {
  show: boolean;
  quality: ConnectionQuality;
  label: string;
  position: TooltipPosition;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  isWebSocketConnected: boolean;
}

export function ConnectionTooltip({
  show,
  quality,
  label,
  position,
  onMouseEnter,
  onMouseLeave,
  isWebSocketConnected,
}: ConnectionTooltipProps) {
  const color = getQualityColor(quality);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: position.vertical === 'top' ? 5 : -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position.vertical === 'top' ? 5 : -5 }}
          transition={{ duration: 0.15 }}
          className={`absolute z-50 min-w-[180px] ${
            position.vertical === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${position.horizontal === 'left' ? 'left-0' : 'right-0'}`}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="relative border-2 border-amber-700/40 p-3 shadow-xl"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 98%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 30%) 98%, transparent) 100%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/30 pointer-events-none" />
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/30 pointer-events-none" />
            <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/30 pointer-events-none" />
            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/30 pointer-events-none" />

            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-700/20">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
              />
              <span className="text-sm font-medium" style={{ color, fontFamily: 'var(--font-serif)' }}>
                {label}
              </span>
            </div>

            {/* WebSocket status only */}
            <div className="space-y-0.5">
              <ServiceRow
                icon={Radio}
                label="Game Connection"
                ok={isWebSocketConnected}
                extra={isWebSocketConnected ? 'Connected' : 'Disconnected'}
              />
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-amber-700/20">
              <span className="text-amber-500/40 text-[10px]">
                {isWebSocketConnected ? 'Real-time connection active' : 'Waiting for connection...'}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 rotate-45 border-amber-700/40 ${
              position.vertical === 'top' ? 'top-full -mt-1 border-r border-b' : 'bottom-full -mb-1 border-l border-t'
            } ${position.horizontal === 'left' ? 'left-1' : 'right-1'}`}
            style={{ background: position.vertical === 'top' ? 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 30%) 98%, transparent)' : 'color-mix(in srgb, var(--surface) 98%, transparent)' }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
