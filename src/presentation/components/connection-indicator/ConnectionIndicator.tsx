'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { WifiOff, Activity } from 'lucide-react';
import { QualityBars, type TooltipPosition } from './helpers';
import { ConnectionTooltip } from './ConnectionTooltip';

interface ConnectionIndicatorProps {
  isWebSocketConnected?: boolean;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

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

/** Get quality label */
function getQualityLabel(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Good';
    case 'fair': return 'Fair';
    case 'poor': return 'Poor';
    case 'offline': return 'Offline';
    default: return 'Unknown';
  }
}

/** Corner accents for the indicator button */
function CornerAccents() {
  return (
    <>
      <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-amber-600/30" />
      <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-amber-600/30" />
      <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-amber-600/30" />
      <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-amber-600/30" />
    </>
  );
}

/** Hook for managing tooltip visibility and position */
function useTooltipState(indicatorRef: React.RefObject<HTMLDivElement | null>) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ vertical: 'bottom', horizontal: 'left' });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    if (indicatorRef.current) {
      const rect = indicatorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const vertical: 'top' | 'bottom' = spaceBelow < 200 ? 'top' : 'bottom';
      const indicatorCenterX = rect.left + rect.width / 2;
      const horizontal: 'left' | 'right' = indicatorCenterX < window.innerWidth / 2 ? 'left' : 'right';
      setTooltipPosition({ vertical, horizontal });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => setShowTooltip(false), 150);
  };

  return { showTooltip, tooltipPosition, handleMouseEnter, handleMouseLeave };
}

/** Simple connection indicator based solely on WebSocket state */
export function ConnectionIndicator({
  isWebSocketConnected = false,
  className = '',
  showLabel = false,
  compact = false,
}: ConnectionIndicatorProps) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const { showTooltip, tooltipPosition, handleMouseEnter, handleMouseLeave } = useTooltipState(indicatorRef);
  
  // Simple quality based on WebSocket only
  const quality: ConnectionQuality = isWebSocketConnected ? 'excellent' : 'offline';
  const color = getQualityColor(quality);
  const label = getQualityLabel(quality);

  const tooltipProps = { 
    show: showTooltip, 
    quality, 
    label, 
    position: tooltipPosition, 
    onMouseEnter: handleMouseEnter, 
    onMouseLeave: handleMouseLeave,
    isWebSocketConnected
  };

  if (compact) {
    return (
      <div 
        ref={indicatorRef} 
        role="button" 
        tabIndex={0} 
        aria-label={`Connection status: ${label}`}
        className={`relative inline-flex items-center justify-center cursor-pointer ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div 
          className="absolute inset-0 rounded-full" 
          style={{ backgroundColor: color }} 
          animate={{ scale: isWebSocketConnected ? [1, 1.8, 1] : 1, opacity: isWebSocketConnected ? [0.4, 0, 0.4] : 0.3 }} 
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} 
        />
        <div className="relative w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        <ConnectionTooltip {...tooltipProps} />
      </div>
    );
  }

  return (
    <div
      ref={indicatorRef}
      role="group"
      aria-label={`Connection status: ${label}`}
      className={`relative inline-flex items-center gap-1.5 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="group relative flex items-center gap-1.5 px-2 py-1 transition-all"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)' }}
      >
        <div className="absolute inset-0 border border-amber-700/30 group-hover:border-amber-600/40 transition-colors" />
        <CornerAccents />

        <div className="relative z-10">
          {isWebSocketConnected ? (
            <Activity className="w-3.5 h-3.5 transition-colors" style={{ color }} />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
        </div>

        <div className="relative z-10">
          <QualityBars quality={quality} />
        </div>

        {showLabel ? (
          <span className="text-[10px] font-medium hidden sm:inline relative z-10" style={{ color, fontFamily: 'var(--font-serif)' }}>
            {label}
          </span>
        ) : null}
      </div>

      <ConnectionTooltip {...tooltipProps} />
    </div>
  );
}
