import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CONSTANTS } from '@/presentation/config/constants';

import { ErrorNotice } from './error-notice';

const DISPLAY_MS = CONSTANTS.TIMING.ERROR_DISPLAY_MS;
/** A tenth of the display time. */
const TENTH = DISPLAY_MS / 10;

describe('ErrorNotice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('should give a newer error its full display time instead of letting the older timer clear it', () => {
    let shown: string | null = null;
    const notice = new ErrorNotice((message) => { shown = message; });

    notice.show('first');
    vi.advanceTimersByTime(8 * TENTH);
    notice.show('second');
    // The first error's display time is over by now; the second one is still shown.
    vi.advanceTimersByTime(3 * TENTH);
    expect(shown).toBe('second');

    vi.advanceTimersByTime(7 * TENTH);
    expect(shown).toBeNull();
  });

  it('should keep a sticky error until it is cleared', () => {
    let shown: string | null = null;
    const notice = new ErrorNotice((message) => { shown = message; });

    notice.show('removed from the table', { sticky: true });
    vi.advanceTimersByTime(DISPLAY_MS * 12);
    expect(shown).toBe('removed from the table');

    notice.clear();
    expect(shown).toBeNull();
  });
});
