'use client';

import { useCallback, useEffect, useState } from 'react';

import { AUTH_FLOW_CONFIG } from './auth-flow.config';
import { cooldownSecondsLeft } from './auth-flow.utils';

/** Seconds until another code may be requested, ticking down once per second. */
export function useResendCooldown(initialSentAt: number | null, cooldownSeconds: number = AUTH_FLOW_CONFIG.RESEND_COOLDOWN_SECONDS) {
  const [sentAt, setSentAt] = useState<number | null>(initialSentAt);
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = cooldownSecondsLeft(sentAt, now, cooldownSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const markSent = useCallback(() => {
    const time = Date.now();
    setSentAt(time);
    setNow(time);
  }, []);

  return { secondsLeft, markSent };
}
