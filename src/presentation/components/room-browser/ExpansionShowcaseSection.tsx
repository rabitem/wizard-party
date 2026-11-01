'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, X } from 'lucide-react';
import type { ExpansionSetId } from '@shared/domain';
import {
  ExpansionCredits,
  ExpansionExplainer,
  ExpansionSetCarousel,
} from '@/presentation/components/expansion-guide';
import { getAllExpansionSources } from '@/presentation/config/expansion-credits.config';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { Modal } from './Modal';

function ExpansionExplainerDialog({ setId, onClose }: { setId: ExpansionSetId; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={EXPANSIONS_UI_CONFIG.GUIDE_CLOSE_LABEL}
          className="p-2 hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-amber-500/60" />
        </button>
      </div>
      <div className="px-4 sm:px-6 pb-6">
        <ExpansionExplainer setId={setId} />
      </div>
    </Modal>
  );
}

/** Home-page carousel of the anniversary editions with credits to the game's owners. */
export function ExpansionShowcaseSection() {
  const [openSetId, setOpenSetId] = useState<ExpansionSetId | null>(null);

  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Flame className="w-3.5 h-3.5 text-amber-500/50" />
        <h2 className="text-amber-400/60 text-xs uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          {EXPANSIONS_UI_CONFIG.GUIDE_HEADING}
        </h2>
      </div>

      <ExpansionSetCarousel onOpen={setOpenSetId} />
      <ExpansionCredits sources={getAllExpansionSources()} className="mt-3" />

      <AnimatePresence>
        {openSetId ? <ExpansionExplainerDialog setId={openSetId} onClose={() => setOpenSetId(null)} /> : null}
      </AnimatePresence>
    </motion.section>
  );
}
