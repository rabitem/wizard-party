import { REALM_OPTIONS } from "@/presentation/components/room-browser/realm-switcher.config";

/**
 * Which realm's room a link preview shows. Share and invite links carry the sharer's realm as
 * `?realm=<id>`; the pages pass it on to their image routes. Kept apart from og-kit.tsx, which reads
 * files only the image routes bundle.
 */
const REALM_IDS: ReadonlySet<string> = new Set(REALM_OPTIONS.map((realm) => realm.pack.id));

export const DEFAULT_OG_REALM = REALM_OPTIONS[0].pack.id;

/** The realm a link asks for, or Classic when it names none or one we have no room for. */
export function ogRealm(requested: string | null | undefined): string {
  return requested && REALM_IDS.has(requested) ? requested : DEFAULT_OG_REALM;
}

/** The preview image's query string: the given parameters plus the realm unless it is Classic. */
export function ogImageQuery(params: Record<string, string | undefined>, requestedRealm: string | null | undefined): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  const realm = ogRealm(requestedRealm);
  if (realm !== DEFAULT_OG_REALM) query.set("realm", realm);
  const text = query.toString();
  return text ? `?${text}` : "";
}
