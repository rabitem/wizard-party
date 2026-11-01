'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { BottomSheet, useClickLock, useSheetState } from '../ui';
import { QUICK_MESSAGES, COOLDOWN_SECONDS } from './types';
import { HudButtonDecor, HudIcon, HudPanelDecor, useHudClassName } from '../hud/skins';
import { CooldownOverlay } from './CooldownOverlay';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner } from '@/presentation/components/seasonal';

/** Corner accents for social buttons */
function ButtonCorners() {
  return (
    <>
      <div className="hidden sm:block absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/40" />
      <div className="hidden sm:block absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/40" />
      <div className="hidden sm:block absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/40" />
      <div className="hidden sm:block absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/40" />
    </>
  );
}

/** Header for desktop dropdown menus */
function DropdownHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <div className="h-px w-6 bg-gradient-to-r from-transparent to-amber-700/30" />
      <span className="text-amber-600/60 text-[10px] uppercase tracking-widest font-serif">
        {label}
      </span>
      <div className="h-px w-6 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

/** Quick message button in desktop dropdown */
function QuickMessageButton({ message, onClick }: { message: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-sm text-amber-200/90 rounded border border-amber-800/40 hover:border-amber-700/50 transition-all cursor-pointer active:scale-95 text-center"
      style={{
        background: THEME_SURFACE.CONTROL_BG,
        fontFamily: 'var(--font-serif)',
      }}
    >
      {message}
    </button>
  );
}

/** Desktop quick chat dropdown popup */
function DesktopChatDropdown({ onSelect }: { onSelect: (message: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="hidden md:block absolute bottom-full mb-2 left-0 z-50"
    >
      <div
        className="relative isolate rounded border-2 border-amber-700/40 p-4 shadow-2xl"
        style={{
          background: THEME_SURFACE.PANEL_BG,
          boxShadow: THEME_SURFACE.POPOVER_SHADOW,
        }}
      >
        <SeasonalCorner position="top-left" size={20} />
        <SeasonalCorner position="top-right" size={20} />
        <HudPanelDecor variant="chat" />
        <DropdownHeader label="Proclamations" />
        <div className="grid grid-cols-3 gap-2" style={{ minWidth: '340px' }}>
          {QUICK_MESSAGES.map((message) => (
            <QuickMessageButton key={message} message={message} onClick={() => onSelect(message)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface QuickChatProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function QuickChat({ onSendMessage, disabled }: QuickChatProps) {
  const { isOpen, toggle, close } = useSheetState('quickchat');
  const [cooldown, setCooldown] = useState(0);
  const tryClick = useClickLock(300);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendMessage = useCallback((message: string) => {
    tryClick(() => {
      if (cooldown > 0) return;
      onSendMessage(message);
      setCooldown(COOLDOWN_SECONDS);
      close();
    });
  }, [cooldown, onSendMessage, tryClick, close]);

  const isOnCooldown = cooldown > 0;
  const isDisabled = disabled || isOnCooldown;
  const skinClass = useHudClassName('button');

  return (
    <div className="relative">
      <button
        onClick={() => !isDisabled && toggle()}
        className={`group relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-all ${
          isDisabled ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
        } ${skinClass}`}
        style={{
          background: THEME_SURFACE.MODAL_BG,
        }}
        title={isOnCooldown ? `Wait ${cooldown}s` : 'Quick chat'}
      >
        {/* Border frame */}
        <div className={`absolute inset-0 rounded border sm:border-2 transition-colors ${
          isOnCooldown ? 'border-amber-600/50' : 'border-amber-800/40 group-hover:border-amber-700/50'
        }`} />
        {/* Inner shadow */}
        <div className="absolute inset-[2px] rounded bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />
        <ButtonCorners />
        <HudButtonDecor />
        {/* Content */}
        <HudIcon id="chat" fallback={MessageCircle} className={`w-4 h-4 sm:w-5 sm:h-5 ${isOnCooldown ? 'text-amber-600/30' : 'text-amber-500/70 group-hover:text-amber-300'}`} />
        {isOnCooldown ? <CooldownOverlay secondsLeft={cooldown} /> : null}
      </button>

      {/* Desktop: Dropdown popup */}
      <AnimatePresence>
        {isOpen && !isOnCooldown ? <DesktopChatDropdown onSelect={handleSendMessage} /> : null}
      </AnimatePresence>

      {/* Mobile: Bottom sheet */}
      <div className="md:hidden">
        <BottomSheet
          isOpen={isOpen ? !isOnCooldown : false}
          onClose={close}
          title="Quick Chat"
          maxHeight={70}
        >
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_MESSAGES.map((msg) => (
                <QuickMessageButton key={msg} message={msg} onClick={() => handleSendMessage(msg)} />
              ))}
            </div>
          </div>
        </BottomSheet>
      </div>
    </div>
  );
}
