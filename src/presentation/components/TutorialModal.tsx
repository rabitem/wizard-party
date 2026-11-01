'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Sparkles, Target, Crown, Zap, Ghost, ScrollText, Swords, Scale, Flame } from 'lucide-react';
import { SPECIAL_CARD_TYPES, getCardCatalogEntry, type CardType } from '@shared/domain';
import { safeLocalStorage } from '@/lib/storage';
import { CONSTANTS } from '../config/constants';
import { ExpansionGuide } from './expansion-guide';
import { THEME_SURFACE } from '@/presentation/config/theme-surface.config';
import { SeasonalCorner, SeasonalEmblem } from '@/presentation/components/seasonal';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TutorialStep {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string[];
  /** Cards explained from the domain card catalog below the text. */
  cards?: readonly CardType[];
  /** Appends the anniversary-edition picker and explainer. */
  showExpansionGuide?: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome, Apprentice!',
    icon: ScrollText,
    content: [
      'Wizard is a game of cunning and foresight for 3-6 players.',
      'Thy quest: predict exactly how many tricks thou shalt win each round.',
      'Accurate prophecies earn glory. False ones bring disgrace!',
    ],
  },
  {
    title: 'The Sacred Deck',
    icon: Crown,
    content: [
      'The classic deck contains 60 enchanted cards:',
      '• 4 suits with cards numbered 1-13',
      '• 4 Wizards — Masters of all tricks',
      '• 4 Jesters — Humble servants who never win',
      'The host may add special cards from the anniversary editions.',
    ],
  },
  {
    title: 'The Mighty Wizards',
    icon: Zap,
    content: [
      'Wizards wield supreme power!',
      '• A Wizard conquers any trick (only the Dragon is mightier)',
      '• When Wizards clash, the first prevails',
      '• When a Wizard leads, all may play whatever they wish',
    ],
  },
  {
    title: 'The Humble Jesters',
    icon: Ghost,
    content: [
      'Jesters are the meekest of cards.',
      '• A Jester can never triumph (unless all play Jesters)',
      '• A Jester declares no lead suit',
      '• Useful for avoiding unwanted victories!',
    ],
  },
  {
    title: 'The Trump Suit',
    icon: Crown,
    content: [
      'After the deal, the next card of the deck is turned up as trump. In the last round no card is left, so there is no trump.',
      '• The trump suit conquers all others',
      '• If a Wizard appears, the dealer chooses trump',
      '• If a Jester appears, no trump exists',
    ],
  },
  {
    title: 'The Prophecy',
    icon: Target,
    content: [
      'Before battle, declare thy prophecy.',
      '• Study thy hand and the trump suit',
      '• Bid zero if thou believest victory eludes thee',
      '• The dealer cannot make total bids equal cards dealt',
    ],
  },
  {
    title: 'The Battle',
    icon: Swords,
    content: [
      'Each warrior plays one card per trick.',
      '• Thou must follow the lead suit if able',
      '• Wizards, Jesters and special cards may always be played',
      '• If a Wizard leads, none need follow suit',
      '• Highest card of lead suit wins (or highest trump)',
    ],
  },
  {
    title: 'Special Cards (Expansions)',
    icon: Flame,
    content: [
      'The anniversary editions add one copy of each chosen special card. Rounds still follow the classic deck.',
    ],
    cards: SPECIAL_CARD_TYPES,
  },
  {
    title: 'The Reckoning',
    icon: Scale,
    content: [
      'Points are awarded at battle\'s end (standard scoring; a room may change it):',
      '• True prophecy: 20 points + 10 per trick won',
      '• False prophecy: -10 points per trick off',
      'Example: Bid 3, win 3 = 50 glory!',
    ],
  },
  {
    title: 'The Campaign',
    icon: Sparkles,
    content: [
      'The war spans many battles.',
      '• Battle 1: 1 card each',
      '• Battle 2: 2 cards each',
      '• Continue until the classic deck is exhausted',
    ],
  },
  {
    title: 'Thou Art Ready!',
    icon: ScrollText,
    content: [
      'Wisdom for thy journey:',
      '• Count thy high cards and Wizards',
      '• Observe what others play to track suits',
      '• Sometimes bidding zero is the wisest strategy!',
      'May fortune favor thee, brave wizard!',
    ],
    showExpansionGuide: true,
  },
];

/** Corner flourishes decoration */
function CornerFlourishes() {
  return (
    <>
      <SeasonalCorner position="top-left" size={28} />
      <SeasonalCorner position="top-right" size={28} />
      <SeasonalCorner position="bottom-left" size={28} />
      <SeasonalCorner position="bottom-right" size={28} />
    </>
  );
}

/** Tutorial header with icon and title */
function TutorialHeader({ step, currentStep, totalSteps, onClose }: { step: TutorialStep; currentStep: number; totalSteps: number; onClose: () => void }) {
  const Icon = step.icon;
  return (
    <div className="relative px-6 py-5 border-b-2 border-amber-800/30" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 10%, transparent) 0%, transparent 100%)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded border border-amber-700/40" style={{ background: THEME_SURFACE.SELECTED_BG }}>
            <Icon className="w-5 h-5 text-amber-400/80" />
          </div>
          <div>
            <h2 className="text-lg text-amber-200/90 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>{step.title}</h2>
            <p className="text-xs text-amber-600/60" style={{ fontFamily: 'Georgia, serif' }}>Chapter {currentStep + 1} of {totalSteps}</p>
          </div>
        </div>
        <button onClick={onClose} className="group relative p-2 transition-all cursor-pointer" style={{ background: THEME_SURFACE.CONTROL_BG }}>
          <div className="absolute inset-0 rounded border border-amber-800/40 group-hover:border-amber-700/50 transition-colors" />
          <X className="w-5 h-5 text-amber-500/70 group-hover:text-amber-400 relative" />
        </button>
      </div>
      <div className="flex items-center justify-center gap-3 mt-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/30 to-amber-700/20" />
        <SeasonalEmblem size={12} className="opacity-70" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/30 to-amber-700/20" />
      </div>
    </div>
  );
}

/** Card glossary entries rendered from the domain card catalog */
function TutorialCardList({ cards }: { cards: readonly CardType[] }) {
  return (
    <ul className="space-y-3">
      {cards.map((type) => {
        const entry = getCardCatalogEntry(type);
        return (
          <li key={type} className="pl-4 border-l-2 border-amber-800/30" style={{ fontFamily: 'Georgia, serif' }}>
            <p className="text-sm text-amber-200/85">
              {entry.name} <span className="text-xs italic text-amber-600/60">({entry.germanName})</span>
              <span className="text-amber-500/70"> — {entry.rank}</span>
            </p>
            <p className="text-xs text-amber-300/65 mt-0.5 leading-relaxed">{entry.rules}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Progress indicator dots */
function ProgressIndicators({ steps, currentStep, onStepClick }: { steps: readonly TutorialStep[]; currentStep: number; onStepClick: (idx: number) => void }) {
  const getProgressClass = (idx: number): string => {
    if (idx === currentStep) return 'w-6 bg-amber-500';
    if (idx < currentStep) return 'w-1.5 bg-amber-600/60';
    return 'w-1.5 bg-amber-800/40';
  };
  return (
    <div className="flex justify-center items-center gap-2 py-4">
      <div className="h-px w-8 bg-gradient-to-r from-transparent to-amber-700/30" />
      <div className="flex gap-1.5">
        {steps.map((s, idx) => <button key={s.title} onClick={() => onStepClick(idx)} className={`h-1.5 rounded-full transition-all cursor-pointer ${getProgressClass(idx)}`} />)}
      </div>
      <div className="h-px w-8 bg-gradient-to-l from-transparent to-amber-700/30" />
    </div>
  );
}

/** Navigation buttons */
function NavigationButtons({ currentStep, totalSteps, onPrev, onNext }: { currentStep: number; totalSteps: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-3 px-6 pb-6">
      <button onClick={onPrev} disabled={currentStep === 0} className="flex-1 py-3 rounded border-2 border-amber-800/40 text-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:border-amber-700/50" style={{ background: THEME_SURFACE.CONTROL_BG, fontFamily: 'Georgia, serif' }}>
        <ChevronLeft className="w-4 h-4" />Previous
      </button>
      <button onClick={onNext} className="flex-1 py-3 rounded border-2 border-amber-600/50 text-amber-100 transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-amber-500/60" style={{ background: THEME_SURFACE.ACTIVE_BG, fontFamily: 'Georgia, serif', boxShadow: '0 0 20px color-mix(in srgb, var(--color-amber-700) 20%, transparent)' }}>
        {currentStep === totalSteps - 1 ? 'Begin Thy Quest!' : <>Continue<ChevronRight className="w-4 h-4" /></>}
      </button>
    </div>
  );
}

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => { if (currentStep < TUTORIAL_STEPS.length - 1) setCurrentStep(currentStep + 1); else onClose(); };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };
  const handleClose = () => { setCurrentStep(0); onClose(); };

  return (
    <AnimatePresence>
      {isOpen ? <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={handleClose} />
        <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50">
          <div className="absolute -inset-4 bg-amber-900/30 rounded-lg blur-2xl" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative rounded-lg border-2 border-amber-700/40 overflow-hidden flex flex-col max-h-[90vh]" style={{ background: THEME_SURFACE.PANEL_BG, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5), 0 0 30px color-mix(in srgb, var(--color-amber-800) 15%, transparent)' }}>
            <CornerFlourishes />
            <TutorialHeader step={step} currentStep={currentStep} totalSteps={TUTORIAL_STEPS.length} onClose={handleClose} />
            <div className="flex-1 px-8 py-6 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="space-y-4">
                  {step.content.map((line) => <p key={line} className={`text-base ${line.startsWith('•') ? 'text-amber-300/70 pl-4' : 'text-amber-200/80'}`} style={{ fontFamily: 'Georgia, serif' }}>{line}</p>)}
                  {step.cards ? <TutorialCardList cards={step.cards} /> : null}
                  {step.showExpansionGuide ? <div className="pt-2 border-t border-amber-800/30"><ExpansionGuide /></div> : null}
                </motion.div>
              </AnimatePresence>
            </div>
            <ProgressIndicators steps={TUTORIAL_STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
            <NavigationButtons currentStep={currentStep} totalSteps={TUTORIAL_STEPS.length} onPrev={handlePrev} onNext={handleNext} />
            <div className="flex justify-center pb-4"><SeasonalEmblem size={14} className="opacity-70" /></div>
          </motion.div>
        </div>
      </> : null}
    </AnimatePresence>
  );
}

const tutorialSeenListeners = new Set<() => void>();

function subscribeTutorialSeen(listener: () => void): () => void {
  tutorialSeenListeners.add(listener);
  return () => {
    tutorialSeenListeners.delete(listener);
  };
}

const readTutorialSeen = () => safeLocalStorage.getItem(CONSTANTS.STORAGE_KEYS.TUTORIAL_SEEN) === 'true';
// The server cannot know; "seen" keeps the hydration render from scheduling the tutorial.
const readTutorialSeenOnServer = () => true;

function writeTutorialSeen(seen: boolean): void {
  if (seen) safeLocalStorage.setItem(CONSTANTS.STORAGE_KEYS.TUTORIAL_SEEN, 'true');
  else safeLocalStorage.removeItem(CONSTANTS.STORAGE_KEYS.TUTORIAL_SEEN);
  tutorialSeenListeners.forEach((listener) => listener());
}

// Hook to check if user has seen the tutorial. Read through an external store, so the server
// and hydration renders agree and blocked storage cannot throw during render.
export function useTutorialSeen() {
  const hasSeen = useSyncExternalStore(subscribeTutorialSeen, readTutorialSeen, readTutorialSeenOnServer);
  const markAsSeen = useCallback(() => writeTutorialSeen(true), []);
  const reset = useCallback(() => writeTutorialSeen(false), []);
  return { hasSeen, markAsSeen, reset };
}
