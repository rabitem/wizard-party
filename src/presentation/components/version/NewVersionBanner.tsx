'use client';

import { motion } from 'motion/react';

import { useNewVersionNotice } from '@/presentation/hooks/useNewVersionNotice';

import { NewVersionNotice } from './NewVersionNotice';

/** The notice on every page without the in-game HUD (top centre); mounted once in the root layout. */
export function NewVersionBanner() {
  const { visible, reload, dismiss } = useNewVersionNotice('floating');
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
    >
      <motion.div className="pointer-events-auto" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <NewVersionNotice onReload={reload} onDismiss={dismiss} />
      </motion.div>
    </div>
  );
}
