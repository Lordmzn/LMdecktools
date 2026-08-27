import { test, expect } from '@playwright/test';
import { BASE } from './base';

/**
 * Installability, which is a storage feature (#89).
 *
 * The point is not offline support. WebKit's tracking prevention deletes every
 * script-writable store after 7 idle days, and a Home Screen web app sits
 * outside that timer — so whether the browser will *offer* to install this app
 * decides whether an iPhone user's collection survives a fortnight's break. See
 * `docs/durability-convergence-transport.md` D3.
 *
 * **This project runs against the production build, not `pnpm dev`**, and it is
 * the only one that does. There is no service worker in dev at all: SvelteKit's
 * automatic registration is off, and `service-worker-client.ts` returns early on
 * `import.meta.env.DEV`. The precache lists (`build`, `prerendered`) are also
 * empty until something is built, so a dev-server run of this file would assert
 * on a worker that caches nothing. See `playwright.config.ts`.
 */

/** Waits out `install` + `activate`; `ready` alone resolves while installing. */
async function activeWorker(page: import('@playwright/test').Page) {
	return await page.evaluate(async () => {
		const registration = await navigator.serviceWorker.ready;

		if (registration.active?.state !== 'activated') {
			await new Promise<void>((resolve) => {
				const worker = registration.installing ?? registration.waiting ?? registration.active;
				if (!worker) return resolve();
				worker.addEventListener('statechange', () => {
					if (worker.state === 'activated') resolve();
				});
			});
		}

		return { scope: registration.scope, scriptURL: registration.active?.scriptURL ?? null };
	});
}

/** Every URL in the app-shell cache, as pathnames. */
async function shellCache(page: import('@playwright/test').Page): Promise<string[]> {
	return await page.evaluate(async () => {
		const key = (await caches.keys()).find((k) => k.startsWith('lm-decktools-shell-'));
		if (!key) return [];
		const entries = await (await caches.open(key)).keys();
		return entries.map((request) => new URL(request.url).pathname);
	});
}

test.describe('web app manifest', () => {
	test('is linked, valid, and confined to the app subfolder', async ({ page }) => {
		await page.goto('./');

		const href = await page.locator('link[rel="manifest"]').getAttribute('href');
		expect(href).toBe(`${BASE}/manifest.webmanifest`);

		const response = await page.request.get(href!);
		expect(response.status()).toBe(200);

		// Apache serves this from `AddType application/manifest+json .webmanifest`
		// in static/.htaccess. Without it some browsers reject the manifest and the
		// install prompt silently never appears.
		expect(response.headers()['content-type']).toContain('application/manifest+json');

		const manifest = await response.json();

		// A scope of `/` would claim the whole of lordmzn.it — the app shares a
		// document root with the main site.
		expect(manifest.scope).toBe(`${BASE}/`);
		expect(manifest.start_url).toBe(`${BASE}/`);

		// `install-context.ts` detects the installed app with
		// `matchMedia('(display-mode: standalone)')`, false under any weaker value.
		expect(manifest.display).toBe('standalone');
	});

	test('every declared icon is actually served, as an image', async ({ page }) => {
		await page.goto('./');

		const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();

		for (const icon of manifest.icons) {
			const response = await page.request.get(icon.src);
			expect(response.status(), `${icon.src} is declared but not served`).toBe(200);
			expect(response.headers()['content-type']).toContain('image/png');
		}

		// iOS ignores manifest icons entirely and reads this instead, so it is the
		// one that matters on the platform installing is about.
		const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
		expect((await page.request.get(apple!)).status()).toBe(200);
	});
});

test.describe('service worker', () => {
	test('registers inside the base path, never at the origin root', async ({ page }) => {
		await page.goto('./');

		const { scope, scriptURL } = await activeWorker(page);

		// The whole constraint in one assertion: a worker scoped to `/` would
		// intercept the main site's pages too.
		expect(new URL(scope).pathname).toBe(`${BASE}/`);
		expect(new URL(scriptURL!).pathname).toBe(`${BASE}/service-worker.js`);
	});

	test('precaches every prerendered page, in both locales', async ({ page }) => {
		await page.goto('./');
		await activeWorker(page);
		await expect.poll(async () => (await shellCache(page)).length).toBeGreaterThan(0);

		const cached = await shellCache(page);

		for (const route of ['/', '/collection/', '/card-lists/', '/card-lists/compare/']) {
			expect(cached, `${route} is missing from the shell`).toContain(`${BASE}${route}`);
			expect(cached, `the Italian ${route} is missing`).toContain(`${BASE}/it-it${route}`);
		}
	});

	test('leaves the crawler files and the OG image out of the shell', async ({ page }) => {
		await page.goto('./');
		await activeWorker(page);
		await expect.poll(async () => (await shellCache(page)).length).toBeGreaterThan(0);

		const cached = await shellCache(page);

		// Refetched on every launch otherwise, for files no visitor's browser ever
		// requests — og-image.jpg alone is 75 KB, and it is read by scrapers.
		expect(cached).not.toContain(`${BASE}/og-image.jpg`);
		expect(cached).not.toContain(`${BASE}/sitemap.xml`);
		expect(cached).not.toContain(`${BASE}/robots.txt`);
	});

	test('serves a route offline that was never visited online', async ({ page, context }) => {
		await page.goto('./');
		await activeWorker(page);
		await expect.poll(async () => (await shellCache(page)).length).toBeGreaterThan(0);

		// Never navigated to during this test — it is in the cache because
		// `install` precached the whole shell, not because it was visited.
		await context.setOffline(true);
		const response = await page.goto('./collection/', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBe(200);
		await expect(page.locator('h1')).toBeVisible();

		await context.setOffline(false);
	});

	test('never touches cross-origin requests, so the image cache keeps one owner', async ({
		page
	}) => {
		await page.goto('./');
		await activeWorker(page);

		// Scryfall art is cached by `image-cache.ts` through `caches.open()`
		// directly (project-vision.md §4.1). If the worker intercepted it, the
		// response would land in the shell cache and two owners would write one
		// cache. The request is expected to fail in CI — what matters is where it
		// does *not* end up.
		await page
			.evaluate(() => fetch('https://api.scryfall.com/cards/random').catch(() => null))
			.catch(() => null);

		const cached = await shellCache(page);
		expect(cached.some((path) => path.includes('scryfall'))).toBe(false);

		// And the image cache is untouched by our `activate` sweep, which is
		// prefix-scoped for exactly this reason.
		const keys = await page.evaluate(() => caches.keys());
		expect(keys.filter((key) => key.startsWith('lm-decktools-shell-')).length).toBeLessThan(2);
	});
});

test.describe('share target (#91, T2)', () => {
	/**
	 * A service worker's response to a `share_target` POST cannot be the page
	 * itself — the browser only accepts a redirect out of it, which is what
	 * turns the POST into a plain GET the route can render. Content validation
	 * (a genuine `.json` envelope, merge-vs-union) is covered at the unit level
	 * (`import-guard.test.ts`, `store-share-envelope.test.ts`) and the component
	 * level (`share-target.test.ts`); this only has to prove the worker's own
	 * mechanism — intercept, stash, redirect — actually runs in a real browser
	 * against the real build.
	 */
	async function postShare(page: import('@playwright/test').Page, action: string, body: string) {
		return await page.evaluate(
			async ({ actionUrl, payload }) => {
				const formData = new FormData();
				formData.append('file', new File([payload], 'share.json', { type: 'application/json' }));
				const response = await fetch(actionUrl, { method: 'POST', body: formData });
				return { redirected: response.redirected, url: response.url, status: response.status };
			},
			{ actionUrl: action, payload: body }
		);
	}

	test('intercepts the manifest-declared POST and redirects to the receiving route', async ({
		page
	}) => {
		await page.goto('./');
		await activeWorker(page);

		const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
		const action = manifest.share_target.action as string;
		expect(action).toBe(`${BASE}/share-target/`);

		const result = await postShare(page, action, '{"hello":"world"}');

		// `fetch()` does follow the worker's synthetic redirect — status 200 here
		// can only mean the GET on the receiving route's prerendered page, since
		// nothing else answers a POST to this path — but `Response.redirected`
		// does not reliably reflect a redirect a service worker synthesised
		// in-process rather than one that came over the network, so that flag is
		// not asserted on.
		expect(result.status).toBe(200);
		expect(new URL(result.url).pathname).toBe(action);
	});

	test('stashes the shared file where the receiving route reads it', async ({ page }) => {
		await page.goto('./');
		await activeWorker(page);

		const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
		await postShare(page, manifest.share_target.action, '{"hello":"world"}');

		const stashed = await page.evaluate(async () => {
			const cache = await caches.open('lm-decktools-share-stash');
			const hit = await cache.match('share-payload');
			return hit ? await hit.text() : null;
		});

		expect(stashed).toBe('{"hello":"world"}');
	});

	test('a malformed share (no file field) still redirects, rather than failing the OS share action', async ({
		page
	}) => {
		await page.goto('./');
		await activeWorker(page);

		const manifest = await (await page.request.get(`${BASE}/manifest.webmanifest`)).json();
		const action = manifest.share_target.action as string;

		const result = await page.evaluate(async (actionUrl) => {
			const response = await fetch(actionUrl, { method: 'POST', body: new FormData() });
			return { url: response.url, status: response.status };
		}, action);

		expect(result.status).toBe(200);
		expect(new URL(result.url).pathname).toBe(action);
	});
});
