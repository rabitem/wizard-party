import { useEffect } from 'react';
import { progressForScroll, type StationBox } from './hall-path';
import { HALL_STATION_ATTRIBUTE, hallProgressStore } from './hall-progress-store';

function measureStations(): StationBox[] {
  return Array.from(document.querySelectorAll<HTMLElement>(`[${HALL_STATION_ATTRIBUTE}]`), (element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top + window.scrollY, height: rect.height };
  });
}

/** Keeps hallProgressStore in step with the page's scroll position and layout. */
export function useHallScrollProgress(): void {
  useEffect(() => {
    let stations = measureStations();
    let frame = 0;
    const update = () => {
      frame = 0;
      hallProgressStore.set(progressForScroll(stations, window.scrollY, window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const remeasure = () => {
      stations = measureStations();
      schedule();
    };
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
    };
  }, []);
}
