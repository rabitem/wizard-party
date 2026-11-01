import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AnimationSandboxClient } from './AnimationSandboxClient';

export const metadata: Metadata = {
  title: 'Animation sandbox',
  robots: { index: false, follow: false },
};

/**
 * Developer tool: available in development, on Vercel preview deployments (behind Vercel's login,
 * where browser checks run on real GPUs), or in a build that opts in explicitly.
 */
function isSandboxEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
    || process.env.VERCEL_ENV === 'preview'
    || process.env.NEXT_PUBLIC_ENABLE_ANIMATION_SANDBOX === '1';
}

export default function AnimationSandboxPage() {
  if (!isSandboxEnabled()) notFound();
  return <AnimationSandboxClient />;
}
