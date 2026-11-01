import { CONSTANTS } from '@/presentation/config/constants';

/**
 * The one error the player sees at a time. A newer error replaces an older one and gets its full
 * display time (an older error's timer never clears a newer error). Sticky errors (the lobby shows
 * them as a screen, e.g. a kick) stay until dismissed.
 */
export class ErrorNotice {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly set: (message: string | null) => void) {}

  show(message: string, { sticky = false } = {}): void {
    this.cancelTimer();
    this.set(message);
    if (sticky) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.set(null);
    }, CONSTANTS.TIMING.ERROR_DISPLAY_MS);
  }

  clear(): void {
    this.cancelTimer();
    this.set(null);
  }

  private cancelTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
