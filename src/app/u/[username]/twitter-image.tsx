import { OG_SIZE } from '../../_og/og-kit';
import ProfileImage from './opengraph-image';

// Segment config has to be a literal in each file; the values match opengraph-image.tsx.
export const runtime = 'nodejs';
export const revalidate = 60;
export const alt = 'A Wizard Party player: their character, name and level.';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Same picture as the Open Graph image; without it the site's own twitter-image would win. */
export default ProfileImage;
