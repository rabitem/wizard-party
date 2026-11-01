'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

/**
 * Wrapper that shows a chevron scroll indicator when content is scrollable
 */
export function ScrollIndicator({ children, className = '', maxHeight = '100%' }: ScrollIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollHeight, clientHeight, scrollTop } = container;
      const hasOverflow = scrollHeight > clientHeight;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold

      setCanScroll(hasOverflow);
      setIsAtBottom(atBottom);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);

    // Also check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [children]);

  const scrollDown = () => {
    containerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`overflow-y-auto overscroll-contain ${className}`}
        style={{ maxHeight, WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>

      {/* Scroll indicator */}
      {canScroll && !isAtBottom ? <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none">
          {/* Gradient fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-8"
            style={{
              background: 'linear-gradient(to top, color-mix(in srgb, color-mix(in srgb, var(--surface), black 50%) 95%, transparent) 0%, transparent 100%)',
            }}
          />
          {/* Chevron button */}
          <button
            onClick={scrollDown}
            className="relative z-10 mb-1 p-1 rounded-full pointer-events-auto cursor-pointer animate-bounce"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-amber-800) 40%, transparent) 0%, color-mix(in srgb, var(--color-amber-900) 30%, transparent) 100%)',
              border: '1px solid color-mix(in srgb, var(--color-amber-800) 40%, transparent)',
            }}
          >
            <ChevronDown className="w-4 h-4 text-amber-400" />
          </button>
        </div> : null}
    </div>
  );
}
