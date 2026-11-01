'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';
import { SITE_URL } from '@/config/deployment.config';
import { Modal } from './Modal';

/** Dialog header with share icon and close button */
function DialogHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-700/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-600/40 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-700) 20%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 10%, transparent) 100%)' }}>
            <Share2 className="w-5 h-5 text-amber-500/80" />
          </div>
          <div>
            <h2 className="text-lg text-amber-100/95" style={{ fontFamily: 'Georgia, serif' }}>Share Room</h2>
            <p className="text-amber-500/50 text-xs" style={{ fontFamily: 'Georgia, serif' }}>Invite others to join</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-amber-900/30 rounded-lg transition-colors"><X className="w-5 h-5 text-amber-500/60" /></button>
      </div>
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
function RoomCodeSection({ roomId }: { roomId: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
        <span className="text-amber-100/85 text-sm" style={{ fontFamily: 'Georgia, serif' }}>Room code</span>
      </div>
      <div className="text-xl sm:text-2xl font-mono text-amber-200 text-center py-2.5 sm:py-3 rounded-xl border border-amber-700/30 tracking-widest" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)' }}>{roomId}</div>
    </div>
  );
}

/** Share link with copy button */
function ShareLinkSection({ shareUrl, copied, onCopy }: { shareUrl: string; copied: boolean; onCopy: () => void }) {
  const btnClass = copied ? 'border-emerald-600/60 text-emerald-300' : 'border-amber-700/40 hover:border-amber-600/50 text-amber-300/80 hover:bg-amber-900/20';
  const btnBg = copied ? 'linear-gradient(180deg, rgba(80,140,80,0.3) 0%, rgba(60,100,60,0.2) 100%)' : 'linear-gradient(180deg, rgba(25,20,14,0.9) 0%, rgba(18,15,10,0.9) 100%)';
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
        <span className="text-amber-100/85 text-sm" style={{ fontFamily: 'Georgia, serif' }}>Share link</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2.5 rounded-xl border border-amber-700/30 text-amber-400/80 text-xs sm:text-sm font-mono overflow-hidden" style={{ background: 'color-mix(in srgb, color-mix(in srgb, var(--surface), black 60%) 60%, transparent)' }}>
          <span className="block truncate">{shareUrl}</span>
        </div>
        <button onClick={onCopy} className={`px-3 sm:px-4 py-2 rounded-xl border transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0 text-sm active:scale-95 ${btnClass}`} style={{ background: btnBg, fontFamily: 'Georgia, serif' }}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

/** Footer with privacy links */
function DialogFooter() {
  return (
    <div className="px-4 sm:px-6 py-3 border-t border-amber-700/20">
      <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs" style={{ fontFamily: 'Georgia, serif' }}>
        <Link href="/privacy" className="text-amber-600/30 hover:text-amber-400 transition-colors">Privacy</Link>
        <span className="text-amber-700/20">·</span>
        <Link href="/imprint" className="text-amber-600/30 hover:text-amber-400 transition-colors">Imprint</Link>
      </div>
    </div>
  );
}

interface ShareDialogProps { roomId: string; onClose: () => void; }

export function ShareDialog({ roomId, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${SITE_URL}/join?room=${roomId}`;
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!canShare) return;
    try { await navigator.share({ title: 'Join my Wizard Party game!', text: `Join my game with room code: ${roomId}`, url: shareUrl }); } catch { /* ignore AbortError */ }
  }, [canShare, roomId, shareUrl]);

  return (
    <Modal onClose={onClose}>
      <DialogHeader onClose={onClose} />
      <div className="p-4 sm:p-6">
        <QRCodeSection shareUrl={shareUrl} />
        <RoomCodeSection roomId={roomId} />
        <ShareLinkSection shareUrl={shareUrl} copied={copied} onCopy={handleCopy} />
        {canShare ? <button onClick={handleNativeShare} className="w-full py-3 rounded-xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ background: 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 50%, var(--accent-cta-bottom) 100%)', boxShadow: '0 4px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif', color: '#1a1510' }}><ExternalLink className="w-4 h-4" />Share via...</button> : null}
      </div>
      <DialogFooter />
    </Modal>
  );
}
