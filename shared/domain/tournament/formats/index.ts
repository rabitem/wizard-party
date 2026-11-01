import type { TournamentFormatId } from '../tournament.types';
import { KNOCKOUT_FORMAT } from './knockout.format';
import { SERIES_FORMAT } from './series.format';
import type { ITournamentFormat } from './tournament-format';

export type { ITournamentFormat, PlannedTable, RoundDecision } from './tournament-format';
export { SERIES_FORMAT } from './series.format';
export { KNOCKOUT_FORMAT, advanceCount } from './knockout.format';

/** Registry of formats by id. A new format is one strategy plus one entry here. */
export const TOURNAMENT_FORMATS: { readonly [K in TournamentFormatId]: ITournamentFormat } = {
  series: SERIES_FORMAT,
  knockout: KNOCKOUT_FORMAT,
};

export function getTournamentFormat(id: TournamentFormatId): ITournamentFormat {
  return TOURNAMENT_FORMATS[id];
}
