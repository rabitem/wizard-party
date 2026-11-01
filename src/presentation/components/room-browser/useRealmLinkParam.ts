'use client';

import { useSelectedTableTheme } from '../table/table-theme';
import { CLASSIC_REALM_PACK, REALM_OPTIONS } from './realm-switcher.config';

/**
 * `&realm=<id>` for an invite or results link, so its link preview shows the sharer's room (the
 * realm whose table they play at); empty for Classic, the previews' default.
 */
export function useRealmLinkParam(): string {
  const table = useSelectedTableTheme();
  const realm = REALM_OPTIONS.find((option) => option.table.id === table.id);
  return realm && realm.pack.id !== CLASSIC_REALM_PACK.id ? `&realm=${realm.pack.id}` : '';
}
