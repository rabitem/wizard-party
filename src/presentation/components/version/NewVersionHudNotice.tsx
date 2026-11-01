'use client';

import { HUD_SLOT_ORDER } from '@/presentation/config/responsive.config';
import { useNewVersionNotice } from '@/presentation/hooks/useNewVersionNotice';

import { HudSlot } from '../hud/layout';
import { NewVersionNotice } from './NewVersionNotice';

/** The notice inside the in-game HUD (prompt region), so it never covers the table's controls. */
export function NewVersionHudNotice() {
  const { visible, reload, dismiss } = useNewVersionNotice('hud');
  if (!visible) return null;
  return (
    <HudSlot region="prompt" order={HUD_SLOT_ORDER.prompt.newVersion}>
      <NewVersionNotice onReload={reload} onDismiss={dismiss} />
    </HudSlot>
  );
}
