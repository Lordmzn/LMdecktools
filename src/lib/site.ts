/**
 * Where the deployed site lives (#25).
 *
 * Baked in at build time because the sitemap, `<link rel="canonical">` and the
 * Open Graph tags all have to name an absolute URL, and a prerendered page has
 * no request to read a host from.
 *
 * `www` is not a stylistic choice: Tophost's certificate carries exactly one
 * SAN, `www.lordmzn.it`, and the apex has no DNS record at all.
 */
export const SITE_URL = 'https://www.lordmzn.it';

/**
 * The subfolder the app is served from, mirroring `kit.paths.base`.
 *
 * Duplicated rather than imported from `$app/paths` because this module is read
 * by the sitemap endpoint and by plain unit tests, neither of which has the
 * SvelteKit module graph. `site.test.ts` fails if the two ever disagree.
 *
 * In components, prefer `import { base } from '$app/paths'` — that is the value
 * SvelteKit itself resolves links against.
 */
export const BASE_PATH = '/decktools';

/** Absolute URL for an app path (locale prefix included, base excluded). */
export function absoluteUrl(pathname: string): string {
	return `${SITE_URL}${BASE_PATH}${pathname}`;
}

/**
 * Reduce a live pathname to the bare app route, for comparing against a literal
 * like `/collection`.
 *
 * Three things sit between `$page.url.pathname` and that: the base path, the
 * locale prefix, and the trailing slash `+layout.ts` forces. `i18n.route()`
 * removes the locale but puts the base back on, so this strips the base and
 * normalises the slash. Pass `i18n.route($page.url.pathname)` as `pathWithBase`.
 */
export function appRoute(pathWithBase: string, base: string): string {
	const withoutBase =
		base && pathWithBase.startsWith(base) ? pathWithBase.slice(base.length) : pathWithBase;

	return withoutBase.replace(/\/+$/, '') || '/';
}
