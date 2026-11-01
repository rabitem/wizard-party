'use client';

import { createElement, Fragment } from 'react';
import { useSelectedTableTheme } from '@/presentation/components/table/table-theme';
import { CasinoEnvironment } from '../CasinoEnvironment';
import { getEnvironmentAtmosphere, getThemedEnvironment } from './environment-registry';
import { EnvironmentAtmosphere } from './primitives/realism';

/**
 * Surroundings for the selected table theme: seasonal tables get their own
 * room and props (plus its optional atmosphere), every other table keeps
 * the casino.
 */
export function ThemedEnvironment() {
  const tableTheme = useSelectedTableTheme();
  const Environment = getThemedEnvironment(tableTheme.id) ?? CasinoEnvironment;
  const atmosphere = getEnvironmentAtmosphere(tableTheme.id);
  // Keyed by theme so switching rooms remounts cleanly (fog, lights, resources).
  return createElement(
    Fragment,
    { key: tableTheme.id },
    createElement(Environment),
    createElement(EnvironmentAtmosphere, { atmosphere }),
  );
}
