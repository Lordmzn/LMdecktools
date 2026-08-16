/**
 * Canonical origin of the deployed site (#25).
 *
 * Baked in at build time because the sitemap, the `<link rel="canonical">` and
 * the Open Graph tags all have to name an absolute URL, and a prerendered page
 * has no request to read a host from. Serving from a subdomain root is what
 * lets this be a bare origin with no `kit.paths.base` — see docs/deployment.md.
 */
export const SITE_URL = 'https://decktools.lordmzn.it';

/** Absolute URL for a locale-prefixed, trailing-slashed app path. */
export function absoluteUrl(pathname: string): string {
	return `${SITE_URL}${pathname}`;
}
