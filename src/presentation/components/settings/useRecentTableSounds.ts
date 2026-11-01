'use client';

import { useEffect, useState } from 'react';
import type { SharedCustomSound } from '@shared/domain';

import { recentTableSounds } from '@/lib/sound/recent-table-sounds';

/** At a table: remembers the sounds other players share there, for import from Preferences. */
export function useRememberTableSounds(sounds: readonly SharedCustomSound[], playerId: string | null) {
  useEffect(() => {
    const others = sounds.filter((sound) => sound.ownerId !== playerId);
    if (others.length > 0) void recentTableSounds.remember(others);
  }, [sounds, playerId]);
}

/** The sounds shared at recent tables, newest first; empty until loaded or where storage is blocked. */
export function useRecentTableSounds(): SharedCustomSound[] {
  const [sounds, setSounds] = useState<SharedCustomSound[]>([]);
  useEffect(() => {
    let active = true;
    void recentTableSounds.list().then((list) => {
      if (active) setSounds(list);
    });
    return () => {
      active = false;
    };
  }, []);
  return sounds;
}
