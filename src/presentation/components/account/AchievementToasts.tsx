'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { ACHIEVEMENTS, type LevelUp } from '@shared/domain/account';

import { GLOW_SHADOW, TOAST_BG } from './account-surfaces';
import { AchievementIcon, TIER_STYLES } from './AchievementIcon';
import { PlayerAvatar } from './PlayerAvatar';
import { SERIF } from './ui';

const VISIBLE_MS = 5_000;

/** One queued announcement. `key` is unique within the queue and used to dismiss it. */
export type AccountToast = { key: string; kind: 'achievement'; achievementId: string } | { key: string; kind: 'level-up'; levelUp: LevelUp };

export const achievementToast = (achievementId: string): AccountToast => ({ key: `achievement:${achievementId}`, kind: 'achievement', achievementId });
export const levelUpToast = (levelUp: LevelUp): AccountToast => ({ key: `level:${levelUp.level}`, kind: 'level-up', levelUp });

interface ToastContent {
  icon: ReactNode;
  eyebrow: string;
  eyebrowClass: string;
  title: string;
  detail: string;
}

function contentOf(toast: AccountToast): ToastContent | null {
  if (toast.kind === 'level-up') {
    const { level, title, rewards } = toast.levelUp;
    return {
      icon: <PlayerAvatar size="lg" level={level} />,
      eyebrow: 'Level up',
      eyebrowClass: 'text-amber-300',
      title: `Level ${level} reached`,
      detail: rewards.length > 0 ? `Unlocked: ${rewards.map((reward) => reward.name).join(', ')}` : `Keep going, ${title}!`,
    };
  }
  const achievement = ACHIEVEMENTS.find((candidate) => candidate.id === toast.achievementId);
  if (!achievement) return null;
  return {
    icon: <AchievementIcon icon={achievement.icon} tier={achievement.tier} />,
    eyebrow: 'Achievement unlocked',
    eyebrowClass: TIER_STYLES[achievement.tier]?.text ?? '',
    title: achievement.name,
    detail: achievement.description,
  };
}

/** Announces level-ups and unlocked achievements, one at a time, in queue order. */
export function AccountToasts({ toasts, onDismiss }: { toasts: AccountToast[]; onDismiss: (key: string) => void }) {
  const current = toasts[0];
  const content = current ? contentOf(current) : null;
  const key = current?.key;
  const known = content !== null;

  useEffect(() => {
    if (!key) return;
    // Unknown achievements are skipped immediately instead of blocking the queue.
    const timer = setTimeout(() => onDismiss(key), known ? VISIBLE_MS : 0);
    return () => clearTimeout(timer);
  }, [key, known, onDismiss]);

  return (
    <div className="fixed inset-x-0 top-3 z-[70] flex justify-center px-4 pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {current && content ? (
          <motion.button
            key={current.key}
            type="button"
            onClick={() => onDismiss(current.key)}
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amber-600/50 pl-3 pr-5 py-3 min-h-11 max-w-sm w-full text-left cursor-pointer"
            style={{ background: TOAST_BG, boxShadow: `0 12px 40px rgba(0,0,0,0.6), ${GLOW_SHADOW}` }}
          >
            {content.icon}
            <span className="min-w-0">
              <span className={`block text-[10px] uppercase tracking-[0.2em] ${content.eyebrowClass}`} style={SERIF}>
                {content.eyebrow}
              </span>
              <span className="block text-amber-50 text-sm truncate" style={SERIF}>{content.title}</span>
              <span className="block text-amber-200/50 text-xs line-clamp-2">{content.detail}</span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
