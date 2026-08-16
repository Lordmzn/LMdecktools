/**
 * Sitemap integrity (#25).
 *
 * The sitemap is generated from a hand-maintained route list, so the failure
 * mode it invites is silent: add a route, forget the list, and the page simply
 * never appears in the sitemap — nothing breaks, nothing warns. The coverage
 * test below is what fails instead.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../site';
import { GET } from '../../routes/sitemap.xml/+server';
import { availableLanguageTags } from '../paraglide/runtime';

const ROUTES_DIR = join(process.cwd(), 'src/routes');

/** Every `+page.svelte` in src/routes, as an app path with a trailing slash. */
function filesystemRoutes(dir = ROUTES_DIR, prefix = '/'): string[] {
	const found: string[] = [];

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isFile() && entry.name === '+page.svelte') {
			found.push(prefix);
		} else if (entry.isDirectory()) {
			found.push(...filesystemRoutes(join(dir, entry.name), `${prefix}${entry.name}/`));
		}
	}

	return found;
}

/** The handler takes no input it uses — it renders from module constants. */
async function renderSitemap(): Promise<string> {
	const response = (GET as unknown as () => Response)();
	return await response.text();
}

describe('sitemap', () => {
	it('lists every prerendered page route', async () => {
		const xml = await renderSitemap();

		for (const route of filesystemRoutes()) {
			expect(xml, `${route} is missing from ROUTES in sitemap.xml/+server.ts`).toContain(
				`<loc>${SITE_URL}${route}</loc>`
			);
		}
	});

	it('emits one entry per route per locale', async () => {
		const xml = await renderSitemap();
		const locs = [...xml.matchAll(/<loc>/g)].length;

		expect(locs).toBe(filesystemRoutes().length * availableLanguageTags.length);
	});

	it('names absolute URLs on the canonical origin only', async () => {
		const xml = await renderSitemap();
		const urls = [...xml.matchAll(/(?:<loc>|href=")(https?:\/\/[^"<]+)/g)].map((m) => m[1]);

		expect(urls.length).toBeGreaterThan(0);
		for (const url of urls) {
			expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
		}
	});

	it('names paths that return 200 rather than redirect', async () => {
		const xml = await renderSitemap();

		// trailingSlash = 'always', so a slashless path would 301 — pointing a
		// crawler at a redirect wastes half its budget on this site.
		for (const [, loc] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
			expect(loc.endsWith('/')).toBe(true);
		}
	});

	it('cross-links every localisation, including itself, plus x-default', async () => {
		const xml = await renderSitemap();
		const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);

		expect(entries.length).toBeGreaterThan(0);
		for (const entry of entries) {
			for (const tag of availableLanguageTags) {
				expect(entry).toContain(`hreflang="${tag}"`);
			}
			expect(entry).toContain('hreflang="x-default"');
		}
	});
});

describe('site origin', () => {
	it('agrees with kit.prerender.origin', async () => {
		// These are two independent constants naming the same host: SITE_URL
		// feeds the sitemap and the meta tags, prerender.origin feeds
		// `url.origin` during prerendering (and thus Paraglide's alternate
		// links). Drift between them ships half the URLs pointing elsewhere.
		const config = await import('../../../svelte.config.js');

		expect(config.default.kit?.prerender?.origin).toBe(SITE_URL);
	});
});
