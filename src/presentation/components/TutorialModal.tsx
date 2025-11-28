'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Sparkles, Target, Crown, Zap, Ghost, HelpCircle } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Wizard!',
    icon: Sparkles,
    color: 'violet',
    content: [
      'Wizard is a trick-taking card game for 3-6 players.',
      'The goal is to predict exactly how many tricks you will win each round.',
      "Correct predictions earn points. Wrong predictions cost points!",
    ],
  },
  {
    title: 'The Deck',
    icon: Crown,
    color: 'amber',
    content: [
      'The deck has 60 cards:',
      '• 4 suits (Red, Yellow, Green, Blue) with cards 1-13',
      '• 4 Wizards - Always win the trick',
      '• 4 Jesters - Always lose the trick',
    ],
  },
  {
    title: 'Wizards',
    icon: Zap,
    color: 'violet',
    content: [
      'Wizards are the most powerful cards!',
      '• A Wizard always wins the trick',
      '• If multiple Wizards are played, the first one wins',
      '• Playing a Wizard sets no lead suit',
    ],
  },
  {
    title: 'Jesters',
    icon: Ghost,
    color: 'emerald',
    content: [
      'Jesters are the weakest cards.',
      '• A Jester never wins (unless all cards are Jesters)',
      '• Playing a Jester sets no lead suit',
      '• Great for avoiding tricks you don\'t want!',
    ],
  },
  {
    title: 'Trump Suit',
    icon: Crown,
    color: 'blue',
    content: [
      'After dealing, a trump card is revealed.',
      '• Trump suit beats all other suits',
      '• If a Wizard is revealed, dealer chooses trump',
      '• If a Jester is revealed, there\'s no trump',
    ],
  },
  {
    title: 'Bidding',
    icon: Target,
    color: 'orange',
    content: [
      'Before playing, predict your tricks.',
      '• Look at your hand and the trump suit',
      '• Bid 0 if you think you won\'t win any tricks',
      '• The total bids cannot equal cards dealt (for the dealer)',
    ],
  },
  {
    title: 'Playing Tricks',
    icon: Sparkles,
    color: 'pink',
    content: [
      'Each player plays one card per trick.',
      '• You must follow the lead suit if possible',
      '• Wizards and Jesters can always be played',
      '• Highest card of lead suit wins (or highest trump)',
    ],
  },
  {
    title: 'Scoring',
    icon: Target,
    color: 'emerald',
    content: [
      'Points are awarded at round end:',
      '• Exact bid: 20 points + 10 per trick won',
      '• Wrong bid: -10 points per trick off',
      'Example: Bid 3, win 3 = 50 points!',
    ],
  },
  {
    title: 'Rounds',
    icon: Sparkles,
    color: 'violet',
    content: [
      'The game plays multiple rounds.',
      '• Round 1: 1 card each',
      '• Round 2: 2 cards each',
      '• Continue until deck runs out (based on player count)',
    ],
  },
  {
    title: "You're Ready!",
    icon: HelpCircle,
    color: 'violet',
    content: [
      'Tips for success:',
      '• Count your high cards and Wizards',
      '• Watch what others play to track suits',
      '• Sometimes bidding 0 is the smartest play!',
      'Good luck and have fun! 🧙‍♂️',
    ],
  },
];

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  orange: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  pink: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];
  const colors = COLOR_CLASSES[step.color];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50">
            <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent rounded-3xl blur-xl" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-gradient-to-b from-[#12121f] to-[#0a0a12] border border-amber-500/20 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/10 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-light text-amber-100 tracking-wide">{step.title}</h2>
                    <p className="text-xs text-amber-400/50">
                      Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-amber-500/10 rounded-xl border border-transparent hover:border-amber-500/20 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-amber-400/70" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {step.content.map((line, idx) => (
                      <p
                        key={idx}
                        className={`text-base ${
                          line.startsWith('•') ? 'text-amber-200/60 pl-4' : 'text-amber-100'
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 py-3">
                {TUTORIAL_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStep
                        ? 'bg-amber-500 w-6'
                        : idx < currentStep
                        ? 'bg-amber-500/50'
                        : 'bg-[#15152a] border border-amber-500/20'
                    }`}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="flex-1 py-3 bg-[#15152a] border border-amber-500/20 hover:border-amber-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-amber-200 rounded-xl font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 text-white rounded-xl font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
                >
                  {currentStep === TUTORIAL_STEPS.length - 1 ? (
                    "Let's Play!"
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to check if user has seen the tutorial
const TUTORIAL_SEEN_KEY = 'wizard-party-tutorial-seen';

export function useTutorialSeen() {
  const hasSeen = typeof window !== 'undefined' && localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';

  const markAsSeen = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
    }
  };

  const reset = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TUTORIAL_SEEN_KEY);
    }
  };

  return { hasSeen, markAsSeen, reset };
}
