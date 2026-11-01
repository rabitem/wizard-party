'use client';

import { useSocial, useSocialPanel } from '@/presentation/providers/SocialProvider';

import { SocialPanel } from './SocialPanel';
import { SocialToasts } from './SocialToasts';

/** The social panel and notification toasts; mounted once in the root layout. */
export function SocialOverlays() {
  const { enabled } = useSocial();
  const { toasts, dismissToast } = useSocialPanel();
  if (!enabled) return null;
  return (
    <>
      <SocialPanel />
      <SocialToasts items={toasts} onDismiss={dismissToast} />
    </>
  );
}
