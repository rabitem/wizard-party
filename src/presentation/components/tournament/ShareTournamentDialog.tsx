'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, ExternalLink, KeyRound, Share2, X } from 'lucide-react';

import { TOURNAMENT_UI } from '@/presentation/config/tournament.config';

import { FIELD_BG } from '../account/account-surfaces';
import { SERIF } from '../account/ui';
import { Modal } from '../room-browser/Modal';
import { tournamentShareUrl } from './tournament-view-model';

const QR_SIZE = 160;

function CopyRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), TOURNAMENT_UI.COPY_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard refused (permissions); the value stays selectable.
    }
  }, [value]);
  return (
    <div>
      <span className="mb-1.5 block px-1 text-xs uppercase tracking-wider text-amber-400/70" style={SERIF}>
        {label}
      </span>
      <div className="flex gap-2">
        <div className={`min-w-0 flex-1 select-all overflow-hidden rounded-xl border border-amber-700/30 px-3 py-2.5 text-xs sm:text-sm text-amber-200/85 ${mono ? 'font-mono' : ''}`} style={{ background: FIELD_BG }}>
          <span className="block truncate">{value}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm transition-all active:scale-95 cursor-pointer ${copied ? 'border-emerald-600/60 text-emerald-300' : 'border-amber-700/40 text-amber-300/80 hover:border-amber-600/50 hover:bg-amber-900/20'}`}
          style={SERIF}
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}

/** Share sheet: QR code, link and (private tournaments) the invite code. */
export function ShareTournamentDialog({ tournamentId, name, inviteCode, onClose }: { tournamentId: string; name: string; inviteCode: string | null; onClose: () => void }) {
  const shareUrl = tournamentShareUrl(window.location.origin, tournamentId, inviteCode);
  const canShare = typeof navigator.share === 'function';

  const nativeShare = useCallback(async () => {
    try {
      await navigator.share({ title: name, text: `Join my Wizard Party tournament “${name}”!`, url: shareUrl });
    } catch {
      // Dismissed by the user.
    }
  }, [name, shareUrl]);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-amber-700/30 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-600/40 bg-amber-900/20">
            <Share2 className="h-5 w-5 text-amber-500/80" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg text-amber-100/95" style={SERIF}>
              Share tournament
            </h2>
            <p className="text-xs text-amber-500/60" style={SERIF}>
              {inviteCode ? 'Private: only people with this link can enter.' : 'Anyone with an account can enter.'}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-amber-900/30 cursor-pointer" aria-label="Close">
          <X className="h-5 w-5 text-amber-500/60" />
        </button>
      </div>
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex justify-center">
          <div className="rounded-xl border-2 border-amber-700/40 p-3 sm:p-4" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-50) 95%, transparent) 0%, color-mix(in srgb, var(--color-amber-100) 95%, transparent) 100%)' }}>
            <QRCodeSVG value={shareUrl} size={QR_SIZE} level="M" bgColor="transparent" fgColor="#2d2418" title={`QR code for ${name}`} />
          </div>
        </div>
        <CopyRow label="Link" value={shareUrl} />
        {inviteCode ? (
          <div>
            <CopyRow label="Invite code" value={inviteCode} />
            <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-amber-200/45">
              <KeyRound className="h-3.5 w-3.5" aria-hidden /> The link already contains it.
            </p>
          </div>
        ) : null}
        {canShare ? (
          <button
            type="button"
            onClick={nativeShare}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-[0.98] cursor-pointer"
            style={{ background: 'linear-gradient(180deg, var(--accent-cta-top) 0%, var(--accent-cta-mid) 50%, var(--accent-cta-bottom) 100%)', boxShadow: '0 4px 20px color-mix(in srgb, var(--accent-deep) 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)', fontFamily: 'Georgia, serif', color: '#1a1510' }}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Share via…
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
