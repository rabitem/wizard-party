'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Check, Copy, X } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, PanInfo } from 'motion/react';
import { SITE_URL } from '@/config/deployment.config';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';

interface ShareModalProps {
  roomId: string;
  onClose: () => void;
}

/** Modal header with title and close button */
function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-700/30 flex items-center justify-between sticky top-0 z-10"
      style={{ background: THEME_SURFACE.MODAL_BG }}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-amber-600/40 flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 10%, transparent) 100%)' }}
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500/80" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg text-amber-100/95 tracking-wide truncate" style={{ fontFamily: 'Georgia, serif' }}>Invite Players</h2>
          <p className="text-amber-500/60 text-xs sm:text-sm truncate" style={{ fontFamily: 'Georgia, serif' }}>Share this room with friends</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 hover:bg-amber-900/30 rounded-lg border border-transparent hover:border-amber-700/30 transition-colors cursor-pointer flex-shrink-0">
        <X className="w-5 h-5 text-amber-500/70" />
      </button>
    </div>
  );
}

/** QR code display section */
function QRCodeSection({ shareUrl }: { shareUrl: string }) {
  return (
    <div className="flex justify-center mb-4 sm:mb-6">
      <div className="p-3 sm:p-4 rounded-xl border-2 border-amber-700/40" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-50) 95%, transparent) 0%, color-mix(in srgb, var(--color-amber-100) 95%, transparent) 100%)' }}>
        <QRCodeSVG value={shareUrl} size={140} className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px]" level="M" bgColor="transparent" fgColor="#2d2418" />
      </div>
    </div>
  );
}

/** Room code display */
function RoomCodeDisplay({ roomId }: { roomId: string }) {
  return (
    <div className="mb-3 sm:mb-4">
      <label className="block text-xs text-amber-500/70 uppercase tracking-widest mb-1.5 sm:mb-2" style={{ fontFamily: 'Georgia, serif' }}>Room Code</label>
      <div className="text-xl sm:text-2xl font-mono text-amber-200 text-center py-2.5 sm:py-3 rounded-lg border border-amber-700/40 tracking-widest" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 65%) 90%, transparent) 100%)' }}>
        {roomId}
      </div>
    </div>
  );
}

/** Share link with copy button */
function ShareLinkSection({ shareUrl, copied, onCopy }: { shareUrl: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mb-4 sm:mb-6">
      <label className="block text-xs text-amber-500/70 uppercase tracking-widest mb-1.5 sm:mb-2" style={{ fontFamily: 'Georgia, serif' }}>Share Link</label>
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2.5 rounded-lg border border-amber-700/40 text-amber-400/80 text-xs sm:text-sm font-mono overflow-hidden" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 55%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 65%) 90%, transparent) 100%)' }}>
          <span className="block truncate">{shareUrl}</span>
        </div>
        <button
          onClick={onCopy}
          className={`px-3 sm:px-4 py-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-sm ${copied ? 'border-emerald-600/60 text-emerald-300' : 'border-amber-700/40 hover:border-amber-600/50 text-amber-300/80 hover:bg-amber-900/30'}`}
          style={{ background: copied ? 'linear-gradient(180deg, rgba(80,140,80,0.3) 0%, rgba(60,100,60,0.2) 100%)' : 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)', fontFamily: 'Georgia, serif' }}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

/** Action buttons section */
function ActionButtons({ canShare, onShare, onClose }: { canShare: boolean; onShare: () => void; onClose: () => void }) {
  return (
    <div className="flex gap-2 sm:gap-3">
      {canShare ? (
        <button onClick={onShare} className="flex-1 py-3 rounded-lg border-2 border-amber-600/60 hover:border-amber-500/70 text-amber-100 text-sm sm:text-base transition-all cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-600) 40%, transparent) 0%, color-mix(in srgb, var(--color-amber-700) 30%, transparent) 100%)', fontFamily: 'Georgia, serif', boxShadow: '0 0 20px color-mix(in srgb, var(--color-amber-700) 20%, transparent)' }}>
          <Share2 className="w-4 h-4" />Share
        </button>
      ) : null}
      <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-amber-700/40 hover:border-amber-600/50 hover:bg-amber-900/20 text-amber-300/80 text-sm sm:text-base transition-colors cursor-pointer"
        style={{ background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 10%) 90%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 35%) 90%, transparent) 100%)', fontFamily: 'Georgia, serif' }}>Close</button>
    </div>
  );
}

/** Mobile drag handle */
function MobileDragHandle() {
  return <div className="md:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-amber-600/40" /></div>;
}

/** Desktop corner flourishes */
function CornerFlourishes() {
  return (<>
    <SeasonalCorner position="top-left" size={28} className="hidden md:block" />
    <SeasonalCorner position="top-right" size={28} className="hidden md:block" />
  </>);
}

/** Hook for mobile detection and body scroll lock */
function useModalSetup(): { isMobile: boolean } {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, []);
  return { isMobile };
}

export function ShareModal({ roomId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const { isMobile } = useModalSetup();
  const shareUrl = `${SITE_URL}/join?room=${roomId}`;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const y = useMotionValue(0);
  const opacity = useTransform(y, (v) => typeof v !== 'number' || !Number.isFinite(v) ? 1 : Math.max(0, Math.min(1, 1 - v / 300)));
  const scale = useTransform(y, (v) => typeof v !== 'number' || !Number.isFinite(v) ? 1 : Math.max(0.9, Math.min(1, 1 - v / 3000)));

  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) { animate(y, 500, { type: 'spring', damping: 30, stiffness: 300 }); setTimeout(onClose, 200); }
    else animate(y, 0, { type: 'spring', damping: 30, stiffness: 300 });
  };

  const handleCopy = async () => { try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ } };
  const handleShare = async () => { if (canShare) try { await navigator.share({ title: 'Join my Wizard game!', text: 'Click to join the magical card game', url: shareUrl }); } catch { /* noop */ } };

  const panelStyle = { background: 'var(--surface)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), inset 0 1px 0 color-mix(in srgb, var(--accent-deep) 10%, transparent)', ...(isMobile ? { y, opacity, scale } : {}) };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="relative w-full md:w-auto md:max-w-sm">
          <div className="hidden md:block absolute -inset-3 bg-amber-900/30 rounded-2xl blur-2xl" />
          <motion.div className="relative rounded-t-2xl md:rounded-xl border-2 border-[var(--surface-border)] shadow-2xl w-full overflow-hidden" style={panelStyle}
            initial={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95 }} animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { opacity: 0, scale: 0.95 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={isMobile ? 'y' : false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={isMobile ? handleDragEnd : undefined}>
            <MobileDragHandle />
            <CornerFlourishes />
            <div className="max-h-[85vh] md:max-h-[80vh] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <ModalHeader onClose={onClose} />
              <div className="p-4 sm:p-6">
                <QRCodeSection shareUrl={shareUrl} />
                <RoomCodeDisplay roomId={roomId} />
                <ShareLinkSection shareUrl={shareUrl} copied={copied} onCopy={handleCopy} />
                <ActionButtons canShare={canShare} onShare={handleShare} onClose={onClose} />
              </div>
              <div className="flex justify-center pb-4"><SeasonalEmblem size={14} className="opacity-70" /></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
