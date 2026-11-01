'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { safeLocalStorage } from '@/lib/storage';
import { LeaderboardContent, CompactLeaderboardContent } from './LeaderboardContent';
import type { LeaderboardEntry, LeaderboardPosition } from './types';
import {
  LEADERBOARD_PANEL_DEFAULT_WIDTH as DEFAULT_WIDTH,
  LEADERBOARD_PANEL_MAX_WIDTH as MAX_WIDTH,
  LEADERBOARD_PANEL_MIN_WIDTH as MIN_WIDTH,
  getLeaderboardPanelScale,
} from './leaderboard-layout';
import { HudPanelDecor, useHudClassName } from '../skins';

const LEADERBOARD_SIZE_KEY = 'wizard-party-leaderboard-size';
const DEFAULT_HEIGHT = 360;
const MIN_HEIGHT = 220;
const MAX_HEIGHT_VH = 85;

type ResizeEdge = 'left' | 'right' | 'bottom' | 'corner';
type PanelPosition = LeaderboardPosition;

interface ResizeState {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

function loadSavedSize(): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const parsed = safeLocalStorage.readJson(LEADERBOARD_SIZE_KEY) as { width?: unknown; height?: unknown } | null;
  if (!parsed || typeof parsed !== 'object') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  const width = typeof parsed.width === 'number' && parsed.width > 0 ? parsed.width : DEFAULT_WIDTH;
  const height = typeof parsed.height === 'number' && parsed.height > 0 ? parsed.height : DEFAULT_HEIGHT;
  return {
    width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)),
    height: Math.max(MIN_HEIGHT, Math.min(window.innerHeight * MAX_HEIGHT_VH / 100, height)),
  };
}

function saveSize(width: number, height: number) {
  if (typeof window === 'undefined') return;
  safeLocalStorage.writeJson(LEADERBOARD_SIZE_KEY, { width, height });
}

function calculateNewWidth(
  edge: ResizeEdge,
  position: PanelPosition | undefined,
  deltaX: number,
  startWidth: number
): number {
  if (edge === 'left' || edge === 'corner') {
    const widthDelta = position === 'right' ? -deltaX : deltaX;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + widthDelta));
  }
  if (edge === 'right') {
    const widthDelta = position === 'right' ? deltaX : -deltaX;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + widthDelta));
  }
  return startWidth;
}

function calculateNewHeight(edge: ResizeEdge, deltaY: number, startHeight: number): number {
  if (edge === 'bottom' || edge === 'corner') {
    const maxHeight = typeof window !== 'undefined' ? window.innerHeight * MAX_HEIGHT_VH / 100 : DEFAULT_HEIGHT;
    return Math.max(MIN_HEIGHT, Math.min(maxHeight, startHeight + deltaY));
  }
  return startHeight;
}

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  localPlayerId: string;
  currentPlayerIndex: number;
  currentRound: number;
  compact: boolean;
  horizontal?: boolean;
  onClose?: () => void;
  showCloseButton?: boolean;
  position?: LeaderboardPosition;
}

/** Corner accent decorations for the panel */
function PanelCornerAccents() {
  return (
    <>
      <div className="absolute top-0.5 left-0.5 w-2 h-2 border-t border-l border-amber-600/40 pointer-events-none" />
      <div className="absolute top-0.5 right-0.5 w-2 h-2 border-t border-r border-amber-600/40 pointer-events-none" />
      <div className="absolute bottom-0.5 left-0.5 w-2 h-2 border-b border-l border-amber-600/40 pointer-events-none" />
      <div className="absolute bottom-0.5 right-0.5 w-2 h-2 border-b border-r border-amber-600/40 pointer-events-none" />
    </>
  );
}

/** Hook for panel resize functionality */
function usePanelResize(position: PanelPosition | undefined) {
  const [size, setSize] = useState(loadSavedSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<ResizeState | null>(null);
  const positionRef = useRef(position);
  const edgeRef = useRef<ResizeEdge>('corner');

  useEffect(() => { positionRef.current = position; }, [position]);

  const handlePointerMove = useCallback((moveEvent: PointerEvent) => {
    if (!resizeRef.current) return;
    const deltaX = moveEvent.clientX - resizeRef.current.startX;
    const deltaY = moveEvent.clientY - resizeRef.current.startY;
    const newWidth = calculateNewWidth(edgeRef.current, positionRef.current, deltaX, resizeRef.current.startWidth);
    const newHeight = calculateNewHeight(edgeRef.current, deltaY, resizeRef.current.startHeight);
    setSize({ width: newWidth, height: newHeight });
  }, []);

  const handlePointerUp = useCallback(() => { setIsResizing(false); resizeRef.current = null; }, []);

  useEffect(() => { return () => { document.removeEventListener('pointermove', handlePointerMove); document.removeEventListener('pointerup', handlePointerUp); }; }, [handlePointerMove, handlePointerUp]);
  useEffect(() => { if (!isResizing) saveSize(size.width, size.height); }, [isResizing, size]);

  const handleResizeStart = useCallback((e: React.PointerEvent, edge: ResizeEdge) => {
    e.preventDefault(); e.stopPropagation(); setIsResizing(true); edgeRef.current = edge;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startWidth: size.width, startHeight: size.height };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [size, handlePointerMove, handlePointerUp]);

  return { size, handleResizeStart };
}

/** Resize edge handlers */
function ResizeEdges({ position, horizontal, handleResizeStart }: { position: PanelPosition | undefined; horizontal: boolean; handleResizeStart: (e: React.PointerEvent, edge: ResizeEdge) => void }) {
  const showLeft = position === 'right' && !horizontal;
  const showRight = position === 'left' && !horizontal;
  return (
    <>
      {showLeft ? <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-500/20 transition-colors z-10" onPointerDown={(e) => handleResizeStart(e, 'left')} /> : null}
      {showRight ? <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-amber-500/20 transition-colors z-10" onPointerDown={(e) => handleResizeStart(e, 'right')} /> : null}
      {!horizontal ? <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-amber-500/20 transition-colors z-10" onPointerDown={(e) => handleResizeStart(e, 'bottom')} /> : null}
      {!horizontal ? <div className={`absolute bottom-0 w-3 h-3 cursor-nwse-resize hover:bg-amber-500/30 transition-colors z-20 ${position === 'right' ? 'left-0' : 'right-0'}`} onPointerDown={(e) => handleResizeStart(e, 'corner')} /> : null}
    </>
  );
}

/** Panel header with title and close button */
function PanelHeader({ currentRound, scale, showCloseButton, onClose }: { currentRound: number; scale: number; showCloseButton: boolean; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-amber-800/30 flex-shrink-0" style={{ gap: `${8 * scale}px` }}>
      <div className="flex items-center" style={{ gap: `${6 * scale}px` }}>
        <i className="ra ra-scroll-unfurled leading-none text-amber-500/70" style={{ fontSize: `${16 * scale}px` }} />
        <span className="text-amber-400/70 uppercase tracking-wider" style={{ fontFamily: 'var(--font-serif)', fontSize: `${13 * scale}px` }}>Standings</span>
      </div>
      <div className="flex items-center" style={{ gap: `${6 * scale}px` }}>
        <span className="text-amber-600/50" style={{ fontFamily: 'var(--font-serif)', fontSize: `${12 * scale}px` }}>Rnd {currentRound}</span>
        {showCloseButton && onClose ? <button onClick={onClose} className="p-0.5 hover:bg-amber-900/30 transition-colors cursor-pointer"><X style={{ width: `${16 * scale}px`, height: `${16 * scale}px` }} className="text-amber-500/60" /></button> : null}
      </div>
    </div>
  );
}

export function LeaderboardPanel({ entries, localPlayerId, currentPlayerIndex, currentRound, compact, horizontal = false, onClose, showCloseButton = false, position }: LeaderboardPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { size, handleResizeStart } = usePanelResize(position);
  const scale = getLeaderboardPanelScale(size.width, horizontal);
  const panelClass = useHudClassName('panel');
  // maxWidth/maxHeight cap the popover; when docked, the flex chain (min-h-0) shrinks the panel
  // to its HUD region so it never spills into the top or bottom bar.
  const style = horizontal ? { maxWidth: '90vw' } : { width: size.width, height: size.height, maxHeight: `${MAX_HEIGHT_VH}vh` };

  return (
    <div className="relative flex min-h-0 max-w-full flex-col" ref={containerRef}>
      <div className="absolute -inset-1 bg-amber-900/20 blur-md pointer-events-none" />
      {/* 95% opaque surface: no backdrop-filter, which would re-blur the live canvas every frame */}
      <div className={`relative isolate min-h-0 max-w-full border-2 border-amber-700/40 flex flex-col ${horizontal ? 'w-auto' : ''} ${panelClass}`} style={{ ...style, background: 'linear-gradient(180deg, color-mix(in srgb, var(--surface) 95%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 95%, transparent) 50%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 95%, transparent) 100%)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)' }}>
        <HudPanelDecor variant="standings" />
        <PanelCornerAccents />
        <ResizeEdges position={position} horizontal={horizontal} handleResizeStart={handleResizeStart} />
        <PanelHeader currentRound={currentRound} scale={scale} showCloseButton={showCloseButton} onClose={onClose} />
        <div className={`flex-1 min-h-0 ${horizontal ? 'overflow-x-auto' : 'overflow-y-auto'} scrollbar-thin scrollbar-thumb-amber-800/30 scrollbar-track-transparent`}>
          {compact ? <CompactLeaderboardContent entries={entries} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} horizontal={horizontal} scale={scale} /> : <LeaderboardContent entries={entries} localPlayerId={localPlayerId} currentPlayerIndex={currentPlayerIndex} currentRound={currentRound} horizontal={horizontal} scale={scale} />}
        </div>
      </div>
    </div>
  );
}
