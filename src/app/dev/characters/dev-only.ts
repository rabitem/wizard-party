/**
 * The character dev pages check the real assets without accounts or unlocks. They are served in
 * local dev and on Vercel preview deployments, never on the production site.
 */
export const CHARACTER_DEV_PAGES_SERVED = process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview';
