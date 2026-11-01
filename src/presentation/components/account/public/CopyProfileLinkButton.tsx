'use client';

import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

import { Button } from '../ui';

const COPIED_FEEDBACK_MS = 2000;

/** Copies a profile link; falls back to the native share sheet where the clipboard is unavailable. */
export function CopyProfileLinkButton({ url, label = 'Copy profile link', className = '' }: { url: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      if (typeof navigator.share === 'function') await navigator.share({ url }).catch(() => undefined);
    }
  };

  return (
    <Button
      type="button"
      onClick={() => void copy()}
      icon={copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      className={className}
      aria-live="polite"
    >
      {copied ? 'Link copied' : label}
    </Button>
  );
}
