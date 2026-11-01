import { useEffect, useState } from 'react';

/** Below this scroll position the dock always shows. */
const TOP_ZONE_PX = 120;
/** Scrolling less than this in one go changes nothing, so a shaky thumb does not flicker it. */
const MIN_DELTA_PX = 8;
const PHONE_QUERY = '(max-width: 639px)';

/**
 * True while a phone user scrolls down the page, so the fixed top-right dock gets out of the way
 * of the headings; it returns on the first scroll up. Wider screens never hide it.
 */
export function useHideOnScrollDown(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia(PHONE_QUERY);
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!phone.matches || y < TOP_ZONE_PX) {
        setHidden(false);
      } else if (Math.abs(y - last) >= MIN_DELTA_PX) {
        setHidden(y > last);
      } else {
        return;
      }
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return hidden;
}
