'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { AVATAR_PRESETS } from './SettingsPanel';
import { StyledEmoji } from './StyledEmoji';

// Re-export for convenience
export { StyledEmoji };

export interface Emote {
  id: string;
  emoji: string;
  label: string;
}

// Use avatar presets as emotes for consistent theming
export const EMOTES: Emote[] = AVATAR_PRESETS.map(avatar => ({
  id: avatar.id,
  emoji: avatar.emoji,
  label: avatar.label,
}));

// Rate limit cooldown in seconds
const COOLDOWN_SECONDS = 3;

// Cooldown countdown component
function CooldownOverlay({ secondsLeft }: { secondsLeft: number }) {
  return (
    <div className="absolute inset-0 rounded-full bg-[#0a0a15]/80 flex items-center justify-center">
      <span className="text-amber-400 font-bold text-sm">{secondsLeft}</span>
    </div>
  );
}

interface EmoteBarProps {
  onSendEmote: (emoteId: string) => void;
  disabled?: boolean;
}

export function EmoteBar({ onSendEmote, disabled }: EmoteBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendEmote = useCallback((emoteId: string) => {
    if (cooldown > 0) return;
    onSendEmote(emoteId);
    setCooldown(COOLDOWN_SECONDS);
    setIsOpen(false);
  }, [cooldown, onSendEmote]);

  const isOnCooldown = cooldown > 0;
  const isDisabled = disabled || isOnCooldown;

  return (
    <div className="relative">
      <div
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center bg-[#15152a] border-2 transition-all ${
          isOnCooldown ? 'border-amber-500/50' : 'border-amber-500/20'
        } ${
          isDisabled ? 'cursor-not-allowed' : 'hover:border-amber-500/50 hover:bg-[#1a1a2f] cursor-pointer active:scale-95'
        }`}
        title={isOnCooldown ? `Wait ${cooldown}s` : 'Send emote'}
      >
        <span className={`text-2xl ${isOnCooldown ? 'opacity-30' : ''}`}>✨</span>
        {isOnCooldown && <CooldownOverlay secondsLeft={cooldown} />}
      </div>

      <AnimatePresence>
        {isOpen && !isOnCooldown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-2 left-0 z-50"
          >
            <div className="bg-[#0a0a15] border border-amber-500/30 rounded-xl p-4 shadow-2xl">
              <div className="grid grid-cols-6 gap-3" style={{ minWidth: '340px' }}>
                {EMOTES.map((emote) => (
                  <StyledEmoji
                    key={emote.id}
                    emoji={emote.emoji}
                    size="lg"
                    onClick={() => handleSendEmote(emote.id)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface FloatingEmote {
  id: string;
  emoteId: string;
  playerId: string;
  playerName: string;
}

interface EmoteDisplayProps {
  emotes: FloatingEmote[];
}

export function EmoteDisplay({ emotes }: EmoteDisplayProps) {
  if (emotes.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 flex gap-4 p-3 z-[999999] pointer-events-none">
      {emotes.map((emote) => {
        const emoteData = EMOTES.find((e) => e.id === emote.emoteId);
        if (!emoteData) return null;

        return (
          <div
            key={emote.id}
            className="flex flex-col items-center gap-2 p-4 bg-[#0a0a15]/95 backdrop-blur-xl rounded-2xl border-2 border-amber-500/40 shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-[#15152a] border-2 border-amber-500/30 flex items-center justify-center">
              <span className="text-4xl">{emoteData.emoji}</span>
            </div>
            <span className="text-xs text-amber-300 font-semibold">{emote.playerName}</span>
          </div>
        );
      })}
    </div>
  );
}

// Quick chat messages
export const QUICK_MESSAGES = [
  'Good luck!',
  'Well played!',
  'Nice trick!',
  'Oops!',
  'Sorry!',
  "Let's go!",
  'GG!',
  'Rematch?',
];

interface QuickChatProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function QuickChat({ onSendMessage, disabled }: QuickChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendMessage = useCallback((message: string) => {
    if (cooldown > 0) return;
    onSendMessage(message);
    setCooldown(COOLDOWN_SECONDS);
    setIsOpen(false);
  }, [cooldown, onSendMessage]);

  const isOnCooldown = cooldown > 0;
  const isDisabled = disabled || isOnCooldown;

  return (
    <div className="relative">
      <div
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center bg-[#15152a] border-2 transition-all ${
          isOnCooldown ? 'border-amber-500/50' : 'border-amber-500/20'
        } ${
          isDisabled ? 'cursor-not-allowed' : 'hover:border-amber-500/50 hover:bg-[#1a1a2f] cursor-pointer active:scale-95'
        }`}
        title={isOnCooldown ? `Wait ${cooldown}s` : 'Quick chat'}
      >
        <MessageCircle className={`w-6 h-6 text-amber-400/70 ${isOnCooldown ? 'opacity-30' : ''}`} />
        {isOnCooldown && <CooldownOverlay secondsLeft={cooldown} />}
      </div>

      <AnimatePresence>
        {isOpen && !isOnCooldown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full mb-2 left-0 z-50"
          >
            <div className="bg-[#0a0a15] border border-amber-500/30 rounded-xl p-4 shadow-2xl">
              <div className="grid grid-cols-2 gap-2" style={{ minWidth: '280px' }}>
                {QUICK_MESSAGES.map((message) => (
                  <button
                    key={message}
                    onClick={() => handleSendMessage(message)}
                    className="px-4 py-3 text-sm text-amber-100/90 bg-[#15152a] hover:bg-[#1a1a2f] border-2 border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all cursor-pointer active:scale-95 text-center"
                  >
                    {message}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface ChatDisplayProps {
  messages: ChatMessage[];
}

export function ChatDisplay({ messages }: ChatDisplayProps) {
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const processedIds = useRef<Set<string>>(new Set());

  useLayoutEffect(() => {
    // Show new messages and auto-hide after 5 seconds
    const newMessages = messages.filter(m => !processedIds.current.has(m.id));
    if (newMessages.length > 0) {
      newMessages.forEach(msg => processedIds.current.add(msg.id));
      setVisibleMessages((prev) => [...prev, ...newMessages]);

      newMessages.forEach(msg => {
        setTimeout(() => {
          setVisibleMessages((prev) => prev.filter((m) => m.id !== msg.id));
        }, 5000);
      });
    }
  }, [messages]);

  return (
    <div className="fixed bottom-24 left-4 space-y-2 pointer-events-none z-40 max-w-xs">
      <AnimatePresence>
        {visibleMessages.slice(-5).map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative"
          >
            {/* Subtle glow */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-xl blur-sm" />
            <div className="relative bg-[#0a0a15]/95 backdrop-blur-sm border border-amber-500/20 rounded-xl px-4 py-2.5">
              <span className="text-amber-400 text-sm font-medium">{msg.playerName}: </span>
              <span className="text-amber-100/90 text-sm">{msg.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
