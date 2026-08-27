/**
 * Web app manifest integrity (#89).
 *
 * Every failure this guards against is silent. A manifest whose `start_url`
 * falls outside `scope`, an icon path that 404s, a `display` other than
 * `standalone` — none of them throw, none of them log. The install prompt simply
 * never appears, and on iOS that means the app stays inside the 7-day
 * storage-deletion window it was built to escape. See
 * `docs/durability-convergence-transport.md` D3.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_PATH } from '../site';
import { GET } from '../../routes/manifest.webmanifest/+server';

const STATIC_DIR = join(process.cwd(), 'static');

/** The handler takes no input it uses — it renders from module constants. */
async function renderManifest(): Promise<Record<string, unknown>> {
	const response = (GET as unknown as () => Response)();
	return JSON.parse(await response.text());
}

describe('manifest', () => {
	it('is served as application/manifest+json', async () => {
		// Apache needs the matching AddType (asserted below) or some browsers
		// reject the manifest outright.
		const response = (GET as unknown as () => Response)();

		expect(response.headers.get('Content-Type')).toBe('application/manifest+json');
	});

	it('confines start_url, scope and id to the base path', async () => {
		const manifest = await renderManifest();

		// The app is a subfolder of the main site. A scope of `/` would claim
		// lordmzn.it entirely, which is somebody else's site.
		expect(manifest.scope).toBe(`${BASE_PATH}/`);
		expect(manifest.start_url).toBe(`${BASE_PATH}/`);
		expect(manifest.id).toBe(`${BASE_PATH}/`);
	});

	it('names a start_url that returns 200 rather than redirecting', async () => {
		const manifest = await renderManifest();

		// trailingSlash = 'always' — a slashless start URL 301s, and a launch that
		// begins with a redirect is a launch that fails offline.
		expect(String(manifest.start_url).endsWith('/')).toBe(true);
	});

	it('declares display: standalone, which install detection depends on', async () => {
		const manifest = await renderManifest();

		// `install-context.ts` reads `matchMedia('(display-mode: standalone)')`.
		// Under `minimal-ui` or `browser` that query is false, so an installed app
		// would be detected as a browser tab.
		expect(manifest.display).toBe('standalone');
	});

	it('points every icon at a file that exists', async () => {
		const manifest = await renderManifest();
		const icons = manifest.icons as { src: string; sizes: string; purpose: string }[];

		expect(icons.length).toBeGreaterThan(0);
		for (const icon of icons) {
			expect(icon.src.startsWith(`${BASE_PATH}/`)).toBe(true);

			const file = join(STATIC_DIR, icon.src.slice(BASE_PATH.length));
			expect(existsSync(file), `${icon.src} is declared but not in static/`).toBe(true);
		}
	});

	it('declares a share_target action inside scope, as a POST the worker can intercept', async () => {
		const manifest = await renderManifest();
		const shareTarget = manifest.share_target as {
			action: string;
			method: string;
			enctype: string;
			params: { files: { name: string; accept: string[] }[] };
		};

		// Same reasoning as start_url/scope: a path outside BASE_PATH would claim
		// part of the main site, and GET/urlencoded can't carry a file at all.
		expect(shareTarget.action.startsWith(`${BASE_PATH}/`)).toBe(true);
		expect(shareTarget.action.endsWith('/')).toBe(true);
		expect(shareTarget.method).toBe('POST');
		expect(shareTarget.enctype).toBe('multipart/form-data');
		expect(shareTarget.params.files[0]).toEqual({
			name: 'file',
			accept: expect.arrayContaining(['application/json', '.json'])
		});
	});

	it('ships a maskable icon and a plain one, at the sizes installers require', async () => {
		const manifest = await renderManifest();
		const icons = manifest.icons as { src: string; sizes: string; purpose: string }[];

		// Android wants 192 and 512 for the launcher and the splash screen, and a
		// `maskable` variant or it applies its own white plate behind the icon.
		const any = icons.filter((icon) => icon.purpose === 'any').map((icon) => icon.sizes);
		expect(any).toContain('192x192');
		expect(any).toContain('512x512');

		expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
	});

	it('is linked from app.html alongside the apple-touch-icon iOS needs instead', () => {
		const html = readFileSync(join(process.cwd(), 'src/app.html'), 'utf8');

		expect(html).toContain('rel="manifest"');
		// iOS takes the Home Screen icon from this tag and ignores manifest icons,
		// so dropping it costs the icon on the one platform installing is about.
		expect(html).toContain('rel="apple-touch-icon"');
	});
});

describe('service worker deployment rules', () => {
	const htaccess = () => readFileSync(join(STATIC_DIR, '.htaccess'), 'utf8');

	it('gives .webmanifest a MIME type Apache does not know on its own', () => {
		expect(htaccess()).toContain('AddType application/manifest+json .webmanifest');
	});

	it('keeps the worker out of the immutable cache bucket', () => {
		const text = htaccess();

		// `service-worker.js` matches the `\.(js|css|woff2?)$` rule that sets a
		// one-year `immutable`, and Apache applies these sections in source order
		// with `Header set` replacing. So the override must come *after* it —
		// reversed, an installed user is pinned to a stale shell for a year with no
		// way to push a fix.
		const immutable = text.indexOf('max-age=31536000, immutable');
		const override = text.indexOf('<Files "service-worker.js">');

		expect(immutable).toBeGreaterThan(-1);
		expect(override).toBeGreaterThan(immutable);
		expect(text.slice(override)).toContain('must-revalidate');
	});
});
