import { SITE_URL } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

/**
 * Sitemap for the deployed static site (#25).
 *
 * Generated rather than hand-written into `static/` so it cannot drift out of
 * sync with `SITE_URL`, and so adding a route means editing one list here
 * instead of remembering an untracked XML file exists.
 *
 * Paths carry the trailing slash because `+layout.ts` sets
 * `trailingSlash = 'always'` — the sitemap must name the URL that actually
 * returns 200, not the one that 301s to it.
 */
const ROUTES: { path: string; priority: string }[] = [
	{ path: '/', priority: '1.0' },
	{ path: '/card-lists/', priority: '0.8' },
	{ path: '/collection/', priority: '0.8' },
	{ path: '/card-lists/compare/', priority: '0.6' },
	{ path: '/diagnostics/', priority: '0.3' }
];

/** Locale → URL prefix. English is served at the root, Italian under /it-it. */
const LOCALE_PREFIXES: Record<string, string> = { en: '', 'it-it': '/it-it' };

function localisedUrl(locale: string, path: string): string {
	return `${SITE_URL}${LOCALE_PREFIXES[locale]}${path}`;
}

export const GET: RequestHandler = () => {
	const entries = Object.keys(LOCALE_PREFIXES).flatMap((locale) =>
		ROUTES.map(({ path, priority }) => {
			// Every localisation of a page points at every other one, itself
			// included — that is what Google's hreflang spec requires.
			const alternates = Object.keys(LOCALE_PREFIXES)
				.map(
					(alt) =>
						`\t\t<xhtml:link rel="alternate" hreflang="${alt}" href="${localisedUrl(alt, path)}" />`
				)
				.join('\n');

			return [
				'\t<url>',
				`\t\t<loc>${localisedUrl(locale, path)}</loc>`,
				alternates,
				`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${localisedUrl('en', path)}" />`,
				`\t\t<priority>${priority}</priority>`,
				'\t</url>'
			].join('\n');
		})
	);

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		'</urlset>',
		''
	].join('\n');

	return new Response(xml, {
		headers: { 'Content-Type': 'application/xml' }
	});
};
