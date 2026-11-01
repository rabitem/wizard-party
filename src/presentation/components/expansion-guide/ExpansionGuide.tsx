'use client';

import { useState } from 'react';
import type { ExpansionSetId } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import { ExpansionExplainer } from './ExpansionExplainer';
import { ExpansionSetPicker } from './ExpansionSetPicker';

/** Edition picker that swaps to the chosen edition's explainer in place. */
export function ExpansionGuide() {
  const [selectedSetId, setSelectedSetId] = useState<ExpansionSetId | null>(null);

  if (selectedSetId) {
    return <ExpansionExplainer setId={selectedSetId} onBack={() => setSelectedSetId(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-amber-300/70" style={{ fontFamily: 'Georgia, serif' }}>
        {EXPANSIONS_UI_CONFIG.GUIDE_PICKER_INTRO}
      </p>
      <ExpansionSetPicker onSelect={setSelectedSetId} />
    </div>
  );
}
