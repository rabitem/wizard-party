import { WizardPartyMark } from './WizardPartyMark';


/**
 * The sign over the room at the top of the first view: the mark, the name of the house and its
 * promise, with the lit table below it. A soft dark halo keeps it readable over any realm's room
 * (slot machines, neon, snow).
 */
export function HallSign() {
  return (
    <div className="relative isolate text-center">
      {/* Stays inside the column on phones, so it never widens the page */}
      <div aria-hidden className="absolute inset-x-0 sm:-inset-x-16 -inset-y-10 -z-10 bg-[radial-gradient(ellipse_closest-side,rgba(0,0,0,0.62),transparent)]" />
      <WizardPartyMark className="mx-auto w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] drop-shadow-[0_0_18px_var(--glow)]" />
      <h1 className="mt-2 text-5xl sm:text-7xl leading-none tracking-[-0.015em] text-amber-50 [text-wrap:balance] [text-shadow:0_2px_24px_rgba(0,0,0,0.75)] font-serif">
        Wizard Party
      </h1>
      <p className="mt-3 text-lg sm:text-2xl tracking-[0.04em] text-amber-200 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)] font-serif">
        Predict. Play. Prevail.
      </p>
    </div>
  );
}
