'use client';

import { useState, useEffect } from 'react';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>({
    isMobile: false,
    isTablet: false,
    isLandscape: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isLandscape: width > height,
        screenWidth: width,
        screenHeight: height,
      });
    };

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
}

// Touch-friendly tap detection
export function useTouchTap(onTap: () => void, onDoubleTap?: () => void) {
  const [lastTap, setLastTap] = useState(0);

  const handleTap = () => {
    const now = Date.now();
    if (onDoubleTap && now - lastTap < 300) {
      onDoubleTap();
      setLastTap(0);
    } else {
      onTap();
      setLastTap(now);
    }
  };

  return handleTap;
}
