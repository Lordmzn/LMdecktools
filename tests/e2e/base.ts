/**
 * The app's base path, mirroring `kit.paths.base` (#25).
 *
 * Specs navigate with relative targets (`./collection`) so Playwright's
 * `baseURL` supplies this automatically — but anything that matches a rendered
 * `href` or asserts on a URL has to spell it out, because those carry the base.
 */
export const BASE = '/decktools';

/** The href SvelteKit renders for an internal route, base included. */
export function appHref(route: string): string {
	return `${BASE}${route}`;
}
