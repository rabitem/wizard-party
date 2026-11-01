'use client';

import type { ReactNode } from 'react';
import { Suit } from '@shared/domain';
import { useCurrentCardTheme } from '@/presentation/hooks/useCardTheme';
import { ConnectionIndicator } from '../connection-indicator';
import { HudPanelDecor, HudRoundBadgeDecor, useHudClassName } from './skins';
import { getHudSuitColor } from './hud-suit-color';

interface GameStatusBarProps {
  currentRound: number;
  maxRounds: number;
  trumpSuit: Suit | null;
  isConnected?: boolean;
  /** Phone HUD: one slim row as tall as the top-bar buttons, trump shown as an icon */
  compact: boolean;
  /** Shown right under the bar, e.g. the tournament match badge. */
  children?: ReactNode;
}

/** Compact bar matches the height of the top-bar buttons (44px on touch, 40px with a mouse) */
const COMPACT_CONTENT_STYLE = { height: 'var(--hud-control-size, 40px)' } as const;

/** Class sets per density; the layout policy picks one (no viewport breakpoints here). */
const STATUS_BAR_CLASSES = {
  compact: {
    frame: 'border-amber-800/40',
    corner: 'w-1.5 h-1.5',
    content: 'px-2.5 flex items-center',
    gap: 'gap-2',
    section: 'flex items-center gap-1.5',
    label: 'text-[8px] tracking-wider',
    round: 'text-sm',
    roundOf: 'text-xs mx-0.5',
    suitIcon: 'text-base',
  },
  regular: {
    frame: 'border-amber-700/40',
    corner: 'w-2 h-2',
    content: 'px-4 py-3 flex items-center',
    gap: 'gap-4',
    section: 'block text-center',
    label: 'text-[10px] tracking-widest block',
    round: 'text-lg',
    roundOf: 'text-sm mx-1',
    suitIcon: 'text-lg',
  },
} as const;

type StatusBarClasses = (typeof STATUS_BAR_CLASSES)[keyof typeof STATUS_BAR_CLASSES];

function CornerAccents({ size }: { size: string }) {
  return (
    <>
      <div className={`absolute top-0.5 left-0.5 ${size} border-t border-l border-amber-600/40`} />
      <div className={`absolute top-0.5 right-0.5 ${size} border-t border-r border-amber-600/40`} />
      <div className={`absolute bottom-0.5 left-0.5 ${size} border-b border-l border-amber-600/40`} />
      <div className={`absolute bottom-0.5 right-0.5 ${size} border-b border-r border-amber-600/40`} />
    </>
  );
}

function TrumpSection({ trumpSuit, compact, classes }: { trumpSuit: Suit | null; compact: boolean; classes: StatusBarClasses }) {
  const cardTheme = useCurrentCardTheme();
  const suit = trumpSuit ? cardTheme.suits[trumpSuit] : null;
  return (
    <div className={classes.section}>
      {compact ? null : <span className={`font-serif text-amber-600/70 uppercase ${classes.label}`}>Trump</span>}
      {suit ? (
        <div className="flex items-center justify-center gap-1.5" style={{ color: getHudSuitColor(suit.accent) }} title={suit.name}>
          <i className={`ra ${suit.symbol} ${classes.suitIcon} leading-none`} />
          {compact ? null : <span className="text-sm leading-none font-serif">{suit.name}</span>}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1.5 text-amber-500/60" title="No trump">
          <i className={`ra ra-cancel ${classes.suitIcon} leading-none`} />
          {compact ? null : <span className="text-sm leading-none font-serif">None</span>}
        </div>
      )}
    </div>
  );
}

/** Round and trump summary; rendered into the HUD's status region. */
export function GameStatusBar({ currentRound, maxRounds, trumpSuit, isConnected = true, compact, children }: GameStatusBarProps) {
  const panelClass = useHudClassName('panel');
  const badgeClass = useHudClassName('roundBadge');
  const classes = STATUS_BAR_CLASSES[compact ? 'compact' : 'regular'];

  return (
    <div className="relative">
      {/* Outer glow: regular density only */}
      {compact ? null : <div className="absolute -inset-1 bg-amber-900/20 rounded blur-md" />}

      {/* Opaque surface: no backdrop-filter over the live canvas */}
      <div
        className={`relative isolate border-2 ${classes.frame} ${panelClass}`}
        style={{ background: 'var(--surface)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)' }}
      >
        <HudPanelDecor variant="status" />
        <CornerAccents size={classes.corner} />

        <div className={classes.content} style={compact ? COMPACT_CONTENT_STYLE : undefined}>
          <div className={`flex items-center ${classes.gap}`}>
            <ConnectionIndicator isWebSocketConnected={isConnected} compact className="flex-shrink-0" />

            <div className={`relative ${classes.section} ${badgeClass}`}>
              <HudRoundBadgeDecor />
              <span className={`font-serif text-amber-600/70 uppercase ${classes.label}`}>Rnd</span>
              <div className={`font-serif text-amber-200/90 ${classes.round}`}>
                {currentRound}
                <span className={`text-amber-600/40 ${classes.roundOf}`}>/</span>
                <span className={`text-amber-400/60 ${compact ? 'text-xs' : 'text-sm'}`}>{maxRounds}</span>
              </div>
            </div>

            {compact ? (
              <div className="w-px h-5 bg-amber-700/30" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-px h-3 bg-gradient-to-b from-transparent to-amber-700/40" />
                <span className="text-amber-700/50 text-[8px]">✦</span>
                <div className="w-px h-3 bg-gradient-to-t from-transparent to-amber-700/40" />
              </div>
            )}

            <TrumpSection trumpSuit={trumpSuit} compact={compact} classes={classes} />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
