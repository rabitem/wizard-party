'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check } from 'lucide-react';
import { Modal } from './Modal';

interface ShareDialogProps {
  roomId: string;
  host: string;
  onClose: () => void;
}

export function ShareDialog({ roomId, host, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
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

  return (
    <Modal onClose={onClose}>
      <div className="px-6 py-5 border-b border-amber-500/10 bg-amber-500/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-light text-amber-100 tracking-wide">Share Room</h2>
          <p className="text-amber-200/50 text-sm">Invite others to join</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-amber-400/70" />
        </button>
      </div>

      <div className="p-6">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeSVG value={shareUrl} size={160} level="M" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-amber-400/60 uppercase tracking-widest mb-1">Room Code</label>
          <div className="text-2xl font-mono text-amber-300 text-center py-3 bg-[#0a0a15] rounded-xl border border-amber-500/20">
            {roomId}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-amber-400/60 uppercase tracking-widest mb-1">Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2.5 bg-[#0a0a15] text-amber-100/70 rounded-xl border border-amber-500/20 text-sm font-mono truncate"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-2 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 text-amber-200'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
