'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareModalProps {
  roomId: string;
  onClose: () => void;
}

export function ShareModal({ roomId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const host =
    typeof window !== 'undefined'
      ? window.location.hostname === 'localhost'
        ? 'localhost:1999'
        : window.location.host
      : 'localhost:1999';

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}?room=${roomId}&host=${encodeURIComponent(host)}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Wizard game!',
          text: 'Click to join the magical card game',
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent rounded-3xl blur-xl" />
        <div className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <span className="text-amber-400 text-2xl">★</span>
            </div>
            <h2 className="text-xl font-light text-amber-100 tracking-wide">Invite Players</h2>
            <p className="text-amber-200/50 text-sm mt-1">Share this room with friends</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={shareUrl} size={160} level="M" />
            </div>
          </div>

          {/* Room Code */}
          <div className="mb-4">
            <label className="text-xs text-amber-400/60 uppercase tracking-widest">Room Code</label>
            <div className="text-xl font-mono text-amber-300 text-center py-2 bg-[#0a0a15] border border-amber-500/20 rounded-xl mt-1">
              {roomId}
            </div>
          </div>

          {/* Share Link */}
          <div className="mb-6">
            <label className="text-xs text-amber-400/60 uppercase tracking-widest">Link</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-[#0a0a15] text-amber-100/70 rounded-xl text-sm font-mono truncate border border-amber-500/20"
              />
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#15152a] border border-amber-500/20 text-amber-200 hover:border-amber-500/40'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleShare}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-200 rounded-xl font-medium transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Footer decoration */}
          <div className="flex justify-center mt-4 gap-2">
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
            <span className="text-amber-500/40 text-xs">✦</span>
          </div>
        </div>
      </div>
    </div>
  );
}
