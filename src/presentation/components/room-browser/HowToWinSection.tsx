'use client';

import { DEFAULT_RULESET_CONFIG } from '@shared/domain';

const { baseBidPoints, pointsPerTrick, penaltyPerMiss } = DEFAULT_RULESET_CONFIG.scoring;

/** A round in three steps, in running type; the point values are the default room rules. */
const STEPS = [
  { title: 'Bid', text: 'Look at your hand and call how many tricks you will take this round.' },
  { title: 'Play', text: 'Follow suit if you can. Trump beats the other suits, the first Wizard always takes the trick and a Jester never does.' },
  { title: 'Score', text: `Hit your bid exactly for ${baseBidPoints} points plus ${pointsPerTrick} per trick. Miss it and lose ${penaltyPerMiss} for every trick you were off.` },
] as const;

export function HowToWinSection() {
  return (
    <section aria-labelledby="how-to-win-heading" className="mb-8 sm:mb-10">
      <h2 id="how-to-win-heading" className="text-2xl sm:text-3xl text-amber-50 mb-5 font-serif">How to win</h2>
      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span className="shrink-0 w-8 h-8 rounded-full border border-amber-500/50 flex items-center justify-center text-sm text-amber-300 tabular-nums font-serif" aria-hidden>
              {index + 1}
            </span>
            <p className="text-sm sm:text-base leading-relaxed text-amber-100/85 font-serif">
              <span className="text-amber-200">{step.title}.</span> {step.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
