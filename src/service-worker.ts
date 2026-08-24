/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * The app shell worker (#89).
 *
 * **Its job is to exist.** Android will not offer to install a site without a
 * manifest *and* a worker with a fetch handler, and installation is what takes
 * the app out of WebKit's 7-day storage-deletion window — see
 * `docs/durability-convergence-transport.md` D3. Offline support is a
 * by-product, not the goal.
 *
 * Three boundaries it must not cross:
 *
 * - **Cross-origin requests are never touched.** Scryfall card images are cached
 *   by `src/lib/image-cache.ts` through `caches.open()` directly, a decision
 *   `project-vision.md` §4.1 makes on purpose; intercepting them here would put
 *   two owners on one cache. The `fetch` handler returns without calling
 *   `respondWith()` for anything not same-origin, which hands the request back
 *   to the browser untouched.
 * - **`activate` only deletes caches with this app-shell prefix.** A blanket
 *   sweep of `caches.keys()` would take `lm-decktools-images` with it — the
 *   image cache is megabytes of Scryfall art that would then be refetched.
 * - **HTML is network-first.** Prerendered pages keep the same filename across
 *   deploys while pointing at newly hashed assets, so a cache-first shell pins a
 *   visitor to an old build — the same failure `static/.htaccess` guards against
 *   with `must-revalidate`. Only `build` is cache-first, and only because Vite
 *   content-hashes it: a changed file has a changed name, so a hit cannot be
 *   stale.
 *
 * Registration is explicit rather than SvelteKit's automatic one — see
 * `src/lib/service-worker-client.ts` for why.
 */

import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

/**
 * Versioned per build, so a deploy gets a fresh cache rather than a mixed one.
 * The prefix is what `activate` matches on — it must stay distinct from
 * `lm-decktools-images`.
 */
const CACHE_PREFIX = 'lm-decktools-shell-';
const CACHE = `${CACHE_PREFIX}${version}`;

/**
 * Vite's content-hashed output: JS, CSS and the bundled fonts. These are the
 * only URLs that may be answered from cache without asking the network.
 */
const IMMUTABLE = new Set(build);

/**
 * `prerendered` carries the generated endpoints too — `sitemap.xml` and
 * `manifest.webmanifest`. Neither belongs in a shell that is refetched on every
 * launch: the sitemap is for crawlers and the manifest is read by the browser at
 * install time, over the network, by definition.
 *
 * Pages are told apart by their trailing slash, which `+layout.ts` guarantees
 * with `trailingSlash = 'always'` — endpoints keep their extension instead.
 */
const PAGES = prerendered.filter((path) => path.endsWith('/'));

/**
 * Everything the app needs to boot: the hashed bundle, the static assets worth
 * keeping (filtered in `svelte.config.js`), and every prerendered page — all ten
 * of them, five routes across two locales, which is small and makes the whole
 * app navigable offline.
 */
const SHELL = [...build, ...files, ...PAGES];

/**
 * Must match `RECACHE_MESSAGE` in `src/lib/service-worker-client.ts`. Duplicated
 * because a service worker may only import `$service-worker` and
 * `$env/static/public` — a shared constant in `$lib` is a build error here, not
 * an oversight.
 */
const RECACHE_MESSAGE = 'lm-decktools:recache';

/**
 * Fill the cache, tolerating individual failures.
 *
 * Deliberately not `cache.addAll()`, which is atomic: one asset 404ing would
 * fail the whole install, and a worker that never installs means no install
 * prompt on Android and none of the storage benefit that is the point of this
 * file. A partly-filled cache is merely degraded — every miss falls through to
 * the network anyway.
 */
async function fillCache(): Promise<void> {
	const cache = await caches.open(CACHE);

	await Promise.all(
		SHELL.map(async (url) => {
			try {
				const response = await fetch(url, { cache: 'no-cache' });
				if (response.ok) await cache.put(url, response);
			} catch {
				// Offline, or one asset missing from the deploy. Neither is worth
				// failing the install over.
			}
		})
	);
}

sw.addEventListener('install', (event) => {
	// No `skipWaiting()`. A deploy removes the previous build's hashed assets from
	// the server, so a worker that took over mid-session would answer a running
	// page's lazy-loaded chunk requests with a 404. Waiting for the last old tab
	// to close costs one launch and cannot break a live session.
	event.waitUntil(fillCache());
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				// Prefix-scoped: `lm-decktools-images` is not ours to delete.
				if (key.startsWith(CACHE_PREFIX) && key !== CACHE) {
					await caches.delete(key);
				}
			}

			// Takes over pages loaded before this worker existed, so the first visit
			// gets a filled cache rather than the one after it.
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;

	// POST and friends have no cache semantics worth guessing at. When #91 adds
	// `share_target`, its POST to the share action is handled before this line.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Scryfall's API and card art. Not ours — see the header note.
	if (url.origin !== sw.location.origin) return;

	event.respondWith(respond(event, url));
});

async function respond(event: FetchEvent, url: URL): Promise<Response> {
	const { request } = event;
	const cache = await caches.open(CACHE);

	if (IMMUTABLE.has(url.pathname)) {
		const hit = await cache.match(request);
		if (hit) return hit;
		// A miss here is normal rather than exceptional: WebKit prunes the whole
		// cache after 7 idle days. Fall through, fetch it, and put it back.
	}

	try {
		const response = await fetch(request);

		// `basic` excludes opaque and CORS responses, which are not useful to keep
		// and whose size cannot even be measured.
		if (response.ok && response.type === 'basic') {
			// `waitUntil` because the handler returns before the write finishes, and
			// an uncontrolled promise can be cut short when the worker is stopped.
			event.waitUntil(cache.put(request, response.clone()));
		}

		return response;
	} catch (error) {
		const hit = await cache.match(request);
		if (hit) return hit;
		throw error;
	}
}

sw.addEventListener('message', (event) => {
	if ((event.data as { type?: string } | null)?.type === RECACHE_MESSAGE) {
		// Re-cache on launch: an idle week on WebKit leaves the registration alive
		// and the cache empty, and nothing else would refill it until the next
		// deploy changed `version`. The next launch does it instead.
		event.waitUntil(fillCache());
	}
});
