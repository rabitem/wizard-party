'use client';

import Link from 'next/link';
import { ConsentSettingsButton } from '@/presentation/components/CookieConsent';
import { LEGAL_COPY } from '@/presentation/config/legal.config';
import { motion } from 'motion/react';
import { SeasonalEmblem } from '@/presentation/components/seasonal';

export function FooterSection() {
  return (
    <motion.footer
      className="text-center pt-4 pb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-700/20" />
        <SeasonalEmblem size={12} className="opacity-70" />
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-700/20" />
      </div>

      <p className="text-amber-600/30 text-[10px] sm:text-xs mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        Crafted by{' '}
        <a href="https://rabitem.de" target="_blank" rel="noopener noreferrer" className="text-amber-500/40 hover:text-amber-400 transition-colors">
          rabitem.de
        </a>
      </p>

      <div className="flex items-center justify-center gap-3 text-[10px] sm:text-xs" style={{ fontFamily: 'Georgia, serif' }}>
        <Link href="/privacy" className="text-amber-600/30 hover:text-amber-400 transition-colors">
          Privacy
        </Link>
        <span className="text-amber-700/20">&middot;</span>
        <Link href="/imprint" className="text-amber-600/30 hover:text-amber-400 transition-colors">
          Imprint
        </Link>
        <span className="text-amber-700/20">&middot;</span>
        <ConsentSettingsButton className="text-amber-600/30 hover:text-amber-400 transition-colors cursor-pointer" />
      </div>

      <p
        className="mt-3 mx-auto max-w-md px-4 text-amber-600/40 text-[10px] leading-relaxed"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {LEGAL_COPY.TRADEMARK_DISCLAIMER}
      </p>
    </motion.footer>
  );
}
