'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExpansionSetId, IExpansionSet } from '@shared/domain';
import { EXPANSIONS_UI_CONFIG } from '@/presentation/config/expansions.config';
import {
  getExpansionYearLabel,
  getExplainableExpansionSets,
  getSwipeStep,
  wrapCarouselIndex,
} from './expansion-guide';
import { SPECIAL_CARD_ICONS } from './special-card-icons';

interface ExpansionSetCarouselProps {
  onOpen: (setId: ExpansionSetId) => void;
}

const ARROW_BUTTON_CLASS =
  'p-2 rounded-lg border border-amber-800/40 text-amber-500/70 hover:text-amber-300 hover:border-amber-600/50 transition-colors cursor-pointer flex-shrink-0';

/** Pointer-swipe handlers that step the carousel; a swipe never also counts as a click. */
function useSwipeToStep(step: (delta: number) => void) {
  const pointerStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);

  return {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      pointerStartX.current = event.clientX;
      suppressClick.current = false;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerStartX.current === null) return;
      const swipe = getSwipeStep(event.clientX - pointerStartX.current);
      pointerStartX.current = null;
      if (swipe === 0) return;
      suppressClick.current = true;
      step(swipe);
    },
    onPointerCancel: () => {
      pointerStartX.current = null;
    },
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

interface ExpansionSlideProps {
  set: IExpansionSet;
  position: number;
  total: number;
  isActive: boolean;
  onOpen: (setId: ExpansionSetId) => void;
}

function ExpansionSlide({ set, position, total, isActive, onOpen }: ExpansionSlideProps) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position} / ${total}`}
      inert={!isActive}
      className="w-full flex-shrink-0"
    >
      <button
        type="button"
        onClick={() => onOpen(set.id)}
        className="w-full h-full px-1 py-3 rounded-xl text-left transition-colors cursor-pointer hover:bg-amber-900/20"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-amber-200/90">{set.name}</span>
          <span className="text-xs text-amber-300/75">{getExpansionYearLabel(set)}</span>
        </span>
        <span className="block mt-1 text-xs text-amber-100/80 leading-relaxed">{set.description}</span>
        <span className="flex flex-wrap gap-1.5 mt-3" aria-hidden="true">
          {set.cards.map((type) => {
            const Icon = SPECIAL_CARD_ICONS[type];
            return (
              <span
                key={type}
                className="w-7 h-7 rounded-md border border-amber-800/40 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-dim) 25%, transparent) 0%, color-mix(in srgb, var(--color-amber-950) 15%, transparent) 100%)' }}
              >
                <Icon className="w-3.5 h-3.5 text-amber-500/70" />
              </span>
            );
          })}
        </span>
        <span className="flex items-center gap-1 mt-3 text-xs text-amber-400/80">
          {EXPANSIONS_UI_CONFIG.GUIDE_OPEN_LABEL}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </button>
    </div>
  );
}

function CarouselDots({
  sets,
  index,
  onSelect,
}: {
  sets: readonly IExpansionSet[];
  index: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex justify-center gap-1.5 mt-3">
      {sets.map((set, dotIndex) => (
        <button
          key={set.id}
          type="button"
          onClick={() => onSelect(dotIndex)}
          aria-label={`${EXPANSIONS_UI_CONFIG.CAROUSEL_SLIDE_LABEL}: ${set.name}`}
          aria-current={dotIndex === index}
          className={`h-1.5 rounded-full transition-all cursor-pointer ${
            dotIndex === index ? 'w-6 bg-amber-500' : 'w-1.5 bg-amber-800/50 hover:bg-amber-700/60'
          }`}
        />
      ))}
    </div>
  );
}

/** Swipeable, keyboard-accessible carousel of the anniversary editions. */
export function ExpansionSetCarousel({ onOpen }: ExpansionSetCarouselProps) {
  const sets = getExplainableExpansionSets();
  const [index, setIndex] = useState(0);
  const step = (delta: number) => setIndex((current) => wrapCarouselIndex(current + delta, sets.length));
  const swipeHandlers = useSwipeToStep(step);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'Home') setIndex(0);
    else if (event.key === 'End') setIndex(sets.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={EXPANSIONS_UI_CONFIG.GUIDE_HEADING}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/50"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={EXPANSIONS_UI_CONFIG.CAROUSEL_PREVIOUS_LABEL}
          className={ARROW_BUTTON_CLASS}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 overflow-hidden rounded-xl select-none" style={{ touchAction: 'pan-y' }} {...swipeHandlers}>
          <div
            className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
            aria-live="polite"
          >
            {sets.map((set, slideIndex) => (
              <ExpansionSlide
                key={set.id}
                set={set}
                position={slideIndex + 1}
                total={sets.length}
                isActive={slideIndex === index}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          aria-label={EXPANSIONS_UI_CONFIG.CAROUSEL_NEXT_LABEL}
          className={ARROW_BUTTON_CLASS}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <CarouselDots sets={sets} index={index} onSelect={setIndex} />
    </div>
  );
}
