'use client';

import { MINI_CARD_STYLES } from '../bidding/mini-card-styles';
import { getCardCatalogEntry } from '@shared/domain';
import type { SpecialCardNotice } from './special-card-notices';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';

/**
 * Table-wide announcements of what special cards just did.
 */
export function SpecialCardNoticeFeed({ notices }: { notices: SpecialCardNotice[] }) {
  if (notices.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none" aria-live="polite">
      {notices.map((notice) => {
        const style = MINI_CARD_STYLES[notice.cardType];
        return (
          <div
            key={notice.id}
            className={`flex items-center gap-2 px-3 py-1.5 border ${style.borderClass} shadow-lg animate-in fade-in slide-in-from-top-2`}
            style={{ background: THEME_SURFACE.MODAL_BG }}
          >
            <span className={`font-serif text-[10px] font-bold ${style.textClass}`}>
              {getCardCatalogEntry(notice.cardType).cornerLabel}
            </span>
            <span className="text-amber-100/90 text-xs font-serif">{notice.message}</span>
          </div>
        );
      })}
    </div>
  );
}
